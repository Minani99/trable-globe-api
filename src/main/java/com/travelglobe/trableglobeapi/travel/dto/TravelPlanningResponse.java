package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelBudget;
import com.travelglobe.trableglobeapi.travel.domain.TravelCurrency;
import com.travelglobe.trableglobeapi.travel.domain.TravelExpense;
import com.travelglobe.trableglobeapi.travel.domain.TravelReservation;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public record TravelPlanningResponse(
        BigDecimal targetAmount,
        TravelCurrency currency,
        BigDecimal estimatedAmount,
        BigDecimal paidAmount,
        BigDecimal remainingAmount,
        List<TravelExpenseResponse> expenses,
        List<TravelReservationResponse> reservations) {

    public static TravelPlanningResponse of(Optional<TravelBudget> budget,
                                            List<TravelExpense> expenses,
                                            List<TravelReservation> reservations) {
        BigDecimal target = budget.map(TravelBudget::getTargetAmount).orElse(BigDecimal.ZERO);
        TravelCurrency currency = budget.map(TravelBudget::getCurrency).orElse(TravelCurrency.KRW);
        BigDecimal estimated = expenses.stream()
                .map(TravelExpense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = expenses.stream()
                .filter(TravelExpense::isPaid)
                .map(TravelExpense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new TravelPlanningResponse(
                target,
                currency,
                estimated,
                paid,
                target.subtract(estimated),
                expenses.stream().map(TravelExpenseResponse::from).toList(),
                reservations.stream().map(TravelReservationResponse::from).toList());
    }
}
