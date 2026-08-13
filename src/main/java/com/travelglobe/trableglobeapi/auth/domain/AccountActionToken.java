package com.travelglobe.trableglobeapi.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

@Entity
@Table(
        name = "account_action_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_account_tokens_hash", columnNames = "token_hash"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountActionToken {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_credential_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_account_tokens_credential"))
    private MemberCredential credential;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private AccountActionPurpose purpose;

    @Column(name = "token_hash", nullable = false, length = 64, updatable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private AccountActionToken(MemberCredential credential, AccountActionPurpose purpose,
                               String tokenHash, Instant expiresAt, Instant createdAt) {
        this.id = UUID.randomUUID();
        this.credential = credential;
        this.purpose = purpose;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public static AccountActionToken create(MemberCredential credential, AccountActionPurpose purpose,
                                            String tokenHash, Instant expiresAt, Instant createdAt) {
        return new AccountActionToken(credential, purpose, tokenHash, expiresAt, createdAt);
    }

    public void consume(Instant now) {
        consumedAt = now;
    }
}
