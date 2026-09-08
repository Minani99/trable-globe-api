package com.travelglobe.trableglobeapi.profile.domain;

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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A member's optional editorial choices for one public yearly recap. */
@Entity
@Table(
        name = "profile_recap_preferences",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_profile_recap_preferences_member_year",
                columnNames = {"member_id", "recap_year"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProfileRecapPreference extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_profile_recap_preferences_member"))
    private Member member;

    @Column(name = "recap_year", nullable = false)
    private int recapYear;

    @Column(name = "narrative", length = 240)
    private String narrative;

    /** At most three numeric ids, persisted in display order as a comma-separated value. */
    @Column(name = "featured_travel_ids", length = 160)
    private String featuredTravelIds;

    private ProfileRecapPreference(Member member, int recapYear) {
        this.member = member;
        this.recapYear = recapYear;
    }

    public static ProfileRecapPreference create(Member member, int recapYear) {
        return new ProfileRecapPreference(member, recapYear);
    }

    public void update(String narrative, String featuredTravelIds) {
        this.narrative = narrative;
        this.featuredTravelIds = featuredTravelIds;
    }
}
