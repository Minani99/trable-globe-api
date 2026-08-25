package com.travelglobe.trableglobeapi.travel.dto;

import com.travelglobe.trableglobeapi.travel.domain.TravelExpense;
import com.travelglobe.trableglobeapi.travel.domain.TravelExpenseCategory;
import java.math.BigDecimal;

public record TravelExpenseResponse(
        Long id,
        String title,
        TravelExpenseCategory category,
        BigDecimal amount,
        boolean paid) {

    public static TravelExpenseResponse from(TravelExpense expense) {
        return new TravelExpenseResponse(expense.getId(), expense.getTitle(), expense.getCategory(),
                expense.getAmount(), expense.isPaid());
    }
}
