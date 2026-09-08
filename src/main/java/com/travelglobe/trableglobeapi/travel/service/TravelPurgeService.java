package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.social.repository.TravelCommentRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelLikeRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.repository.TravelBudgetRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelExpenseRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelReservationRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelTaskRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Knows how to remove a trip together with everything that hangs off it.
 *
 * <p>Places and photos are owned by the {@link Travel} aggregate (JPA cascade), but tasks,
 * budget, expenses, reservations, likes and comments are separate roots that only point at
 * the trip. PostgreSQL has {@code ON DELETE CASCADE} for them, the local H2 schema generated
 * by Hibernate does not - so the application deletes them explicitly and behaves the same on
 * every profile. Both "delete one trip" and "delete the account" go through this class so the
 * list of child tables lives in exactly one place.
 */
@Service
public class TravelPurgeService {

    private static final Logger log = LoggerFactory.getLogger(TravelPurgeService.class);

    private final TravelRepository travelRepository;
    private final TravelPhotoRepository travelPhotoRepository;
    private final TravelLikeRepository travelLikeRepository;
    private final TravelCommentRepository travelCommentRepository;
    private final TravelTaskRepository travelTaskRepository;
    private final TravelBudgetRepository travelBudgetRepository;
    private final TravelExpenseRepository travelExpenseRepository;
    private final TravelReservationRepository travelReservationRepository;

    public TravelPurgeService(TravelRepository travelRepository,
                              TravelPhotoRepository travelPhotoRepository,
                              TravelLikeRepository travelLikeRepository,
                              TravelCommentRepository travelCommentRepository,
                              TravelTaskRepository travelTaskRepository,
                              TravelBudgetRepository travelBudgetRepository,
                              TravelExpenseRepository travelExpenseRepository,
                              TravelReservationRepository travelReservationRepository) {
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
        this.travelLikeRepository = travelLikeRepository;
        this.travelCommentRepository = travelCommentRepository;
        this.travelTaskRepository = travelTaskRepository;
        this.travelBudgetRepository = travelBudgetRepository;
        this.travelExpenseRepository = travelExpenseRepository;
        this.travelReservationRepository = travelReservationRepository;
    }

    /** Deletes one already-authorised trip. Callers must have verified ownership. */
    @Transactional
    public void purge(Travel travel) {
        Long travelId = travel.getId();
        travelLikeRepository.deleteAllByTravelId(travelId);
        travelCommentRepository.deleteAllByTravelId(travelId);
        travelTaskRepository.deleteAllByTravelId(travelId);
        travelExpenseRepository.deleteAllByTravelId(travelId);
        travelReservationRepository.deleteAllByTravelId(travelId);
        travelBudgetRepository.deleteAllByTravelId(travelId);
        travelRepository.delete(travel);
        log.info("Deleted travel id={} owner={}", travelId, travel.getMember().getId());
    }

    /** Deletes every trip the member owns, including reactions other members left on them. */
    @Transactional
    public int purgeAllOwnedBy(Long memberId) {
        travelLikeRepository.deleteAllByTravelMemberId(memberId);
        travelCommentRepository.deleteAllByTravelMemberId(memberId);
        travelTaskRepository.deleteAllByTravelMemberId(memberId);
        travelExpenseRepository.deleteAllByTravelMemberId(memberId);
        travelReservationRepository.deleteAllByTravelMemberId(memberId);
        travelBudgetRepository.deleteAllByTravelMemberId(memberId);
        travelPhotoRepository.deleteAllForMember(memberId);
        List<Travel> travels = travelRepository.findOwnedTravels(memberId);
        travelRepository.deleteAll(travels);
        travelRepository.flush();
        log.info("Deleted {} travels for member id={}", travels.size(), memberId);
        return travels.size();
    }
}



