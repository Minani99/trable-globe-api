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
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_expenses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelExpense extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_travel_expenses_travel"))
    private Travel travel;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private TravelExpenseCategory category;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid", nullable = false)
    private boolean paid;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private TravelExpense(Travel travel, String title, TravelExpenseCategory category,
                          BigDecimal amount, int sortOrder) {
        this.travel = travel;
        this.title = title;
        this.category = category;
        this.amount = amount;
        this.sortOrder = sortOrder;
        this.paid = false;
    }

    public static TravelExpense create(Travel travel, String title, TravelExpenseCategory category,
                                       BigDecimal amount, int sortOrder) {
        return new TravelExpense(travel, title, category, amount, sortOrder);
    }

    public void update(String title, TravelExpenseCategory category, BigDecimal amount, boolean paid) {
        this.title = title;
        this.category = category;
        this.amount = amount;
        this.paid = paid;
    }
}
