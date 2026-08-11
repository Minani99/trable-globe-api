package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelNavigationLink;
import com.travelglobe.trableglobeapi.travel.dto.TravelSummaryResponse;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.projection.TravelNavProjection;
import com.travelglobe.trableglobeapi.travel.repository.projection.TravelPhotoCountProjection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read side of the travel domain.
 *
 * <p>Named "query" because writes will arrive as a separate command service once
 * authentication exists; keeping the split now avoids a later rename across the codebase.
 */
@Service
@Transactional(readOnly = true)
public class TravelQueryService {

    private final TravelRepository travelRepository;
    private final TravelPhotoRepository travelPhotoRepository;

    public TravelQueryService(TravelRepository travelRepository,
                              TravelPhotoRepository travelPhotoRepository) {
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
    }

    /** Every public trip of a member, newest first. */
    public List<TravelSummaryResponse> findPublicTravels(String normalizedUsername) {
        return toSummaries(travelRepository.findProfileTravels(normalizedUsername, Visibility.PUBLIC));
    }

    /** Public trips that include at least one stop in the given country. */
    public List<TravelSummaryResponse> findPublicTravelsByCountry(String normalizedUsername, String iso2Code) {
        return toSummaries(
                travelRepository.findProfileTravelsByCountry(normalizedUsername, iso2Code, Visibility.PUBLIC));
    }

    public TravelDetailResponse getPublicTravelDetail(Long travelId) {
        Travel travel = travelRepository.findDetail(travelId, Visibility.PUBLIC)
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));

        List<TravelPhoto> photos = travelPhotoRepository.findAllForTravel(travelId);
        List<TravelNavProjection> siblings =
                travelRepository.findNavigationList(travel.getMember().getUsername(), Visibility.PUBLIC);

        return TravelDetailResponse.of(
                travel,
                photos,
                TravelNavigationLink.from(neighbour(siblings, travelId, 1)),
                TravelNavigationLink.from(neighbour(siblings, travelId, -1)));
    }

    /**
     * Picks a neighbour from the newest-first sibling list.
     *
     * @param offset {@code +1} for the older trip, {@code -1} for the newer one
     * @return the neighbour, or {@code null} at either end of the list
     */
    private static TravelNavProjection neighbour(List<TravelNavProjection> siblings, Long travelId, int offset) {
        for (int i = 0; i < siblings.size(); i++) {
            if (siblings.get(i).id().equals(travelId)) {
                int target = i + offset;
                return (target >= 0 && target < siblings.size()) ? siblings.get(target) : null;
            }
        }
        return null;
    }

    /**
     * Maps trips to cards, resolving photo counts with one extra query rather than one per trip.
     */
    private List<TravelSummaryResponse> toSummaries(List<Travel> travels) {
        if (travels.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> photoCounts = countPhotos(travels.stream().map(Travel::getId).toList());

        return travels.stream()
                .map(travel -> TravelSummaryResponse.from(
                        travel, photoCounts.getOrDefault(travel.getId(), 0L)))
                .toList();
    }

    private Map<Long, Long> countPhotos(List<Long> travelIds) {
        Map<Long, Long> counts = new HashMap<>();
        travelPhotoRepository.countByTravelIds(travelIds).forEach(
                row -> counts.put(row.travelId(), row.photoCount()));
        return counts;
    }
}
