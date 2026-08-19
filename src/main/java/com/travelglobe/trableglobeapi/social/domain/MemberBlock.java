package com.travelglobe.trableglobeapi.social.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import com.travelglobe.trableglobeapi.member.domain.Member;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_blocks", uniqueConstraints = @UniqueConstraint(
        name = "uk_member_blocks_pair", columnNames = {"blocker_id", "blocked_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberBlock extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "blocker_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_member_blocks_blocker"))
    private Member blocker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "blocked_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_member_blocks_blocked"))
    private Member blocked;

    private MemberBlock(Member blocker, Member blocked) {
        this.blocker = blocker;
        this.blocked = blocked;
    }

    public static MemberBlock create(Member blocker, Member blocked) {
        return new MemberBlock(blocker, blocked);
    }
}
