package com.travelglobe.trableglobeapi.auth.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import com.travelglobe.trableglobeapi.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Private sign-in data kept outside the public {@link Member} profile. */
@Entity
@Table(
        name = "member_credentials",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_member_credentials_member", columnNames = "member_id"),
                @UniqueConstraint(name = "uk_member_credentials_email", columnNames = "email")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberCredential extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_member_credentials_member"))
    private Member member;

    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    private MemberCredential(Member member, String email, String passwordHash) {
        this.member = member;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public static MemberCredential create(Member member, String email, String passwordHash) {
        return new MemberCredential(member, email, passwordHash);
    }
}
