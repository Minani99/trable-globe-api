package com.travelglobe.trableglobeapi.travel.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import com.travelglobe.trableglobeapi.member.domain.Member;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One trip - the unit a member records, browses and shares.
 *
 * <p>Places are mapped bidirectionally because a travel is the aggregate root that owns
 * its itinerary: they are created, ordered and deleted with the trip. Photos are mapped
 * one-way from the child side instead, so that loading a trip for the globe never drags
 * an image list along with it.
 */
@Entity
@Table(name = "travels")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Travel extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travels_member"))
    private Member member;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private Visibility visibility;

    @OneToMany(mappedBy = "travel", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder asc, id asc")
    private List<TravelPlace> places = new ArrayList<>();

    private Travel(Member member, String title, String description, LocalDate startDate,
                   LocalDate endDate, String coverImageUrl, Visibility visibility) {
        this.member = member;
        this.title = title;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.coverImageUrl = coverImageUrl;
        this.visibility = visibility;
    }

    public static Travel create(Member member, String title, String description, LocalDate startDate,
                                LocalDate endDate, String coverImageUrl, Visibility visibility) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("여행 종료일은 시작일보다 빠를 수 없습니다.");
        }
        return new Travel(member, title, description, startDate, endDate, coverImageUrl, visibility);
    }

    /** Appends a place to the itinerary and keeps both sides of the association in sync. */
    public void addPlace(TravelPlace place) {
        places.add(place);
        place.assignTo(this);
    }

    public List<TravelPlace> getPlaces() {
        return Collections.unmodifiableList(places);
    }

    public boolean isPublic() {
        return visibility == Visibility.PUBLIC;
    }

    /** Trip length in days, counting both the arrival and departure day. */
    public int getDurationDays() {
        return (int) java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }
}
