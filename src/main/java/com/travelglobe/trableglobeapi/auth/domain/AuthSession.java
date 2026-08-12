package com.travelglobe.trableglobeapi.auth.domain;

import com.travelglobe.trableglobeapi.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A revocable opaque login session. The raw bearer token is never stored. */
@Entity
@Table(
        name = "auth_sessions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_auth_sessions_token_hash", columnNames = "token_hash"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthSession {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_auth_sessions_member"))
    private Member member;

    @Column(name = "token_hash", nullable = false, length = 64, updatable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    private AuthSession(UUID id, Member member, String tokenHash, Instant expiresAt, Instant now) {
        this.id = id;
        this.member = member;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.lastUsedAt = now;
    }

    public static AuthSession create(Member member, String tokenHash, Instant expiresAt, Instant now) {
        return new AuthSession(UUID.randomUUID(), member, tokenHash, expiresAt, now);
    }

    public void touch(Instant now) {
        this.lastUsedAt = now;
    }

    public void revoke(Instant now) {
        this.revokedAt = now;
    }
}
