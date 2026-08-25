package com.travelglobe.trableglobeapi.travel.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
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
import jakarta.persistence.Table;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelTask extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_tasks_travel"))
    private Travel travel;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private TravelTaskCategory category;

    @Column(name = "completed", nullable = false)
    private boolean completed;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private TravelTask(Travel travel, String title, TravelTaskCategory category, int sortOrder) {
        this.travel = travel;
        this.title = title;
        this.category = category;
        this.sortOrder = sortOrder;
        this.completed = false;
    }

    public static TravelTask create(Travel travel, String title, TravelTaskCategory category, int sortOrder) {
        return new TravelTask(travel, title, category, sortOrder);
    }

    public static List<TravelTask> defaultsFor(Travel travel) {
        return List.of(
                create(travel, "항공·교통편 확인", TravelTaskCategory.RESERVATION, 0),
                create(travel, "숙소 예약", TravelTaskCategory.RESERVATION, 1),
                create(travel, "여권·비자 유효기간 확인", TravelTaskCategory.DOCUMENT, 2),
                create(travel, "여행자 보험 확인", TravelTaskCategory.DOCUMENT, 3),
                create(travel, "환전·결제수단 준비", TravelTaskCategory.MONEY, 4),
                create(travel, "로밍·eSIM 준비", TravelTaskCategory.OTHER, 5));
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
