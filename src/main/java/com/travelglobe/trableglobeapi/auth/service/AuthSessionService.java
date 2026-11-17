package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.domain.AuthSession;
import com.travelglobe.trableglobeapi.auth.repository.AuthSessionRepository;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.member.domain.Member;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuthSessionService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long TOUCH_INTERVAL_SECONDS = 15 * 60;
    /** Bounds memory if many distinct tokens arrive; a full map is simply rebuilt. */
    private static final int MAX_CACHED_PRINCIPALS = 5_000;

    private final AuthSessionRepository authSessionRepository;
    private final TransactionTemplate transactionTemplate;
    private final int sessionDays;
    private final long cacheSeconds;

    /**
     * Recently verified sessions, keyed by token hash.
     *
     * A signed-in page fires several API calls at once and each one used to open its own
     * transaction just to look the session up again. Remembering a verified session for a
     * short time removes that round trip. Every revocation path below evicts immediately,
     * so logging out or changing a password still takes effect on the next request; the
     * time limit only bounds entries that nothing evicts (natural expiry, a manual fix in
     * the database). This is per instance, which matches the single-instance deployment.
     */
    private final ConcurrentHashMap<String, CachedPrincipal> principals = new ConcurrentHashMap<>();

    public AuthSessionService(AuthSessionRepository authSessionRepository,
                              PlatformTransactionManager transactionManager,
                              @Value("${travel-globe.auth.session-days:30}") int sessionDays,
                              @Value("${travel-globe.auth.session-cache-seconds:60}") long cacheSeconds) {
        this.authSessionRepository = authSessionRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.sessionDays = sessionDays;
        this.cacheSeconds = Math.max(0, cacheSeconds);
    }

    @Transactional
    public IssuedSession issue(Member member) {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(sessionDays, ChronoUnit.DAYS);
        AuthSession session = authSessionRepository.save(
                AuthSession.create(member, hash(rawToken), expiresAt, now));
        return new IssuedSession(rawToken, expiresAt, session.getId());
    }

    /**
     * Not transactional on purpose: a cached session must not cost a database connection.
     * Only a miss opens a transaction.
     */
    public Optional<MemberPrincipal> authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 256) {
            return Optional.empty();
        }
        String tokenHash = hash(rawToken);
        Instant now = Instant.now();
        CachedPrincipal cached = principals.get(tokenHash);
        if (cached != null) {
            if (cached.validUntil().isAfter(now)) {
                return Optional.of(cached.principal());
            }
            principals.remove(tokenHash, cached);
        }
        Optional<CachedPrincipal> loaded = transactionTemplate.execute(status ->
                authSessionRepository.findActive(tokenHash, now).map(session -> {
                    if (session.getLastUsedAt().plusSeconds(TOUCH_INTERVAL_SECONDS).isBefore(now)) {
                        session.touch(now);
                    }
                    Member member = session.getMember();
                    Instant validUntil = now.plusSeconds(cacheSeconds);
                    if (session.getExpiresAt().isBefore(validUntil)) {
                        validUntil = session.getExpiresAt();
                    }
                    return new CachedPrincipal(
                            new MemberPrincipal(member.getId(), member.getUsername(), session.getId()),
                            validUntil);
                }));
        if (loaded == null || loaded.isEmpty()) {
            return Optional.empty();
        }
        if (cacheSeconds > 0) {
            if (principals.size() >= MAX_CACHED_PRINCIPALS) {
                principals.clear();
            }
            principals.put(tokenHash, loaded.get());
        }
        return Optional.of(loaded.get().principal());
    }

    @Transactional
    public void revoke(MemberPrincipal principal) {
        authSessionRepository.findOwned(principal.sessionId(), principal.memberId())
                .ifPresent(session -> session.revoke(Instant.now()));
        forgetMember(principal.memberId());
    }

    @Transactional
    public void revokeAll(Long memberId) {
        authSessionRepository.revokeAllForMember(memberId, Instant.now());
        forgetMember(memberId);
    }

    @Transactional
    public void revokeOtherSessions(MemberPrincipal principal) {
        authSessionRepository.revokeOtherSessionsForMember(
                principal.memberId(), principal.sessionId(), Instant.now());
        forgetMember(principal.memberId());
    }

    @Transactional
    public void deleteAll(Long memberId) {
        authSessionRepository.deleteAllForMember(memberId);
        forgetMember(memberId);
    }

    /**
     * Drops every remembered session of a member. Call whenever a session is revoked or
     * the principal's data (the username) changes.
     *
     * Evicts now and again after the surrounding transaction commits: a request racing
     * the change could otherwise re-read the not-yet-revoked row and remember it.
     */
    public void forgetMember(Long memberId) {
        evictMember(memberId);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evictMember(memberId);
                }
            });
        }
    }

    private void evictMember(Long memberId) {
        principals.values().removeIf(cached -> cached.principal().memberId().equals(memberId));
    }

    static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private record CachedPrincipal(MemberPrincipal principal, Instant validUntil) {
    }

    public record IssuedSession(String token, Instant expiresAt, java.util.UUID sessionId) {
    }
}
