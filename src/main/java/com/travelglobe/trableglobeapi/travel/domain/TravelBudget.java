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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_budgets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelBudget extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "travel_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_travel_budgets_travel"))
    private Travel travel;

    @Column(name = "target_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal targetAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 3)
    private TravelCurrency currency;

    private TravelBudget(Travel travel, BigDecimal targetAmount, TravelCurrency currency) {
        this.travel = travel;
        this.targetAmount = targetAmount;
        this.currency = currency;
    }

    public static TravelBudget create(Travel travel, BigDecimal targetAmount, TravelCurrency currency) {
        return new TravelBudget(travel, targetAmount, currency);
    }

    public void update(BigDecimal targetAmount, TravelCurrency currency) {
        this.targetAmount = targetAmount;
        this.currency = currency;
    }
}
