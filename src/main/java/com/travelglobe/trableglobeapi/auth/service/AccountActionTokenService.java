package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.domain.AccountActionPurpose;
import com.travelglobe.trableglobeapi.auth.domain.AccountActionToken;
import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import com.travelglobe.trableglobeapi.auth.repository.AccountActionTokenRepository;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountActionTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AccountActionTokenRepository repository;

    public AccountActionTokenService(AccountActionTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public IssuedToken issue(MemberCredential credential, AccountActionPurpose purpose, Duration lifetime) {
        Instant now = Instant.now();
        repository.consumePrevious(credential.getId(), purpose, now);
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = now.plus(lifetime);
        repository.save(AccountActionToken.create(credential, purpose, hash(rawToken), expiresAt, now));
        return new IssuedToken(rawToken, expiresAt);
    }

    @Transactional
    public AccountActionToken consume(String rawToken, AccountActionPurpose purpose) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 256) {
            throw invalidToken();
        }
        AccountActionToken token = repository.findActive(hash(rawToken), purpose, Instant.now())
                .orElseThrow(AccountActionTokenService::invalidToken);
        token.consume(Instant.now());
        return token;
    }

    private static InvalidRequestException invalidToken() {
        return new InvalidRequestException("링크가 만료되었거나 이미 사용되었습니다. 새 링크를 요청해 주세요.");
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    public record IssuedToken(String rawToken, Instant expiresAt) {
    }
}
