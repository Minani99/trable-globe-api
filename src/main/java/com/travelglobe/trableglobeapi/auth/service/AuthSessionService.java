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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthSessionService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long TOUCH_INTERVAL_SECONDS = 15 * 60;

    private final AuthSessionRepository authSessionRepository;
    private final int sessionDays;

    public AuthSessionService(AuthSessionRepository authSessionRepository,
                              @Value("${travel-globe.auth.session-days:30}") int sessionDays) {
        this.authSessionRepository = authSessionRepository;
        this.sessionDays = sessionDays;
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

    @Transactional
    public Optional<MemberPrincipal> authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 256) {
            return Optional.empty();
        }
        Instant now = Instant.now();
        return authSessionRepository.findActive(hash(rawToken), now)
                .map(session -> {
                    if (session.getLastUsedAt().plusSeconds(TOUCH_INTERVAL_SECONDS).isBefore(now)) {
                        session.touch(now);
                    }
                    Member member = session.getMember();
                    return new MemberPrincipal(member.getId(), member.getUsername(), session.getId());
                });
    }

    @Transactional
    public void revoke(MemberPrincipal principal) {
        authSessionRepository.findOwned(principal.sessionId(), principal.memberId())
                .ifPresent(session -> session.revoke(Instant.now()));
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

    public record IssuedSession(String token, Instant expiresAt, java.util.UUID sessionId) {
    }
}
