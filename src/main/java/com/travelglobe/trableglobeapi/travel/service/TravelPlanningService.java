package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelBudget;
import com.travelglobe.trableglobeapi.travel.domain.TravelExpense;
import com.travelglobe.trableglobeapi.travel.domain.TravelReservation;
import com.travelglobe.trableglobeapi.travel.dto.TravelPlanningResponse;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelExpenseWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelReservationWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.UpdateTravelBudgetRequest;
import com.travelglobe.trableglobeapi.travel.repository.TravelBudgetRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelExpenseRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TravelPlanningService {

    private static final int MAX_EXPENSES = 50;
    private static final int MAX_RESERVATIONS = 50;

    private final TravelRepository travelRepository;
    private final TravelBudgetRepository budgetRepository;
    private final TravelExpenseRepository expenseRepository;
    private final TravelReservationRepository reservationRepository;

    public TravelPlanningService(TravelRepository travelRepository,
                                 TravelBudgetRepository budgetRepository,
                                 TravelExpenseRepository expenseRepository,
                                 TravelReservationRepository reservationRepository) {
        this.travelRepository = travelRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.reservationRepository = reservationRepository;
    }

    @Transactional(readOnly = true)
    public TravelPlanningResponse findMine(MemberPrincipal principal, Long travelId) {
        requireOwnedTravel(principal, travelId);
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse updateBudget(MemberPrincipal principal, Long travelId,
                                               UpdateTravelBudgetRequest request) {
        Travel travel = requireOwnedTravel(principal, travelId);
        TravelBudget budget = budgetRepository.findByTravelIdAndTravelMemberId(travelId, principal.memberId())
                .orElseGet(() -> TravelBudget.create(travel, request.targetAmount(), request.currency()));
        budget.update(request.targetAmount(), request.currency());
        budgetRepository.saveAndFlush(budget);
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse createExpense(MemberPrincipal principal, Long travelId,
                                                TravelExpenseWriteRequest request) {
        Travel travel = requireOwnedTravel(principal, travelId);
        long count = expenseRepository.countByTravelId(travelId);
        if (count >= MAX_EXPENSES) {
            throw new InvalidRequestException("여행 비용은 최대 50개까지 만들 수 있습니다.");
        }
        TravelExpense expense = TravelExpense.create(
                travel, request.title().trim(), request.category(), request.amount(), Math.toIntExact(count));
        if (Boolean.TRUE.equals(request.paid())) {
            expense.update(expense.getTitle(), expense.getCategory(), expense.getAmount(), true);
        }
        expenseRepository.saveAndFlush(expense);
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse updateExpense(MemberPrincipal principal, Long travelId, Long expenseId,
                                                TravelExpenseWriteRequest request) {
        TravelExpense expense = ownedExpense(principal, travelId, expenseId);
        expense.update(request.title().trim(), request.category(), request.amount(), Boolean.TRUE.equals(request.paid()));
        expenseRepository.flush();
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse deleteExpense(MemberPrincipal principal, Long travelId, Long expenseId) {
        expenseRepository.delete(ownedExpense(principal, travelId, expenseId));
        expenseRepository.flush();
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse createReservation(MemberPrincipal principal, Long travelId,
                                                    TravelReservationWriteRequest request) {
        Travel travel = requireOwnedTravel(principal, travelId);
        long count = reservationRepository.countByTravelId(travelId);
        if (count >= MAX_RESERVATIONS) {
            throw new InvalidRequestException("여행 예약은 최대 50개까지 만들 수 있습니다.");
        }
        TravelReservation reservation = TravelReservation.create(
                travel, request.title().trim(), request.category(), request.reservationDate(),
                textOrNull(request.memo()), Math.toIntExact(count));
        if (Boolean.TRUE.equals(request.confirmed())) {
            reservation.update(reservation.getTitle(), reservation.getCategory(), reservation.getReservationDate(),
                    reservation.getMemo(), true);
        }
        reservationRepository.saveAndFlush(reservation);
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse updateReservation(MemberPrincipal principal, Long travelId, Long reservationId,
                                                    TravelReservationWriteRequest request) {
        TravelReservation reservation = ownedReservation(principal, travelId, reservationId);
        reservation.update(request.title().trim(), request.category(), request.reservationDate(),
                textOrNull(request.memo()), Boolean.TRUE.equals(request.confirmed()));
        reservationRepository.flush();
        return response(principal, travelId);
    }

    @Transactional
    public TravelPlanningResponse deleteReservation(MemberPrincipal principal, Long travelId, Long reservationId) {
        reservationRepository.delete(ownedReservation(principal, travelId, reservationId));
        reservationRepository.flush();
        return response(principal, travelId);
    }

    private TravelPlanningResponse response(MemberPrincipal principal, Long travelId) {
        return TravelPlanningResponse.of(
                budgetRepository.findByTravelIdAndTravelMemberId(travelId, principal.memberId()),
                expenseRepository.findOwnedExpenses(travelId, principal.memberId()),
                reservationRepository.findOwnedReservations(travelId, principal.memberId()));
    }

    private Travel requireOwnedTravel(MemberPrincipal principal, Long travelId) {
        return travelRepository.findOwnedDetail(travelId, principal.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));
    }

    private TravelExpense ownedExpense(MemberPrincipal principal, Long travelId, Long expenseId) {
        return expenseRepository.findByIdAndTravelIdAndTravelMemberId(expenseId, travelId, principal.memberId())
                .orElseThrow(() -> new ResourceNotFoundException("여행 비용을 찾을 수 없습니다: " + expenseId));
    }

    private TravelReservation ownedReservation(MemberPrincipal principal, Long travelId, Long reservationId) {
        return reservationRepository.findByIdAndTravelIdAndTravelMemberId(
                        reservationId, travelId, principal.memberId())
                .orElseThrow(() -> new ResourceNotFoundException("여행 예약을 찾을 수 없습니다: " + reservationId));
    }

    private static String textOrNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
