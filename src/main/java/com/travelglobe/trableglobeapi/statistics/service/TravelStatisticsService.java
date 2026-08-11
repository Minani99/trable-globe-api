package com.travelglobe.trableglobeapi.statistics.service;

import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Profile-level travel totals.
 *
 * <p>Aggregation happens in SQL; this class only decides which visibility the caller is
 * allowed to count. Today that is always {@code PUBLIC} - when authentication lands, an
 * owner viewing their own profile will count private trips too.
 */
@Service
@Transactional(readOnly = true)
public class TravelStatisticsService {

    private final TravelRepository travelRepository;

    public TravelStatisticsService(TravelRepository travelRepository) {
        this.travelRepository = travelRepository;
    }

    /**
     * @param normalizedUsername handle already passed through {@code Member.normalizeUsername}
     */
    public TravelStatisticsResponse getPublicStatistics(String normalizedUsername) {
        return TravelStatisticsResponse.from(
                travelRepository.findStatistics(normalizedUsername, Visibility.PUBLIC));
    }
}
