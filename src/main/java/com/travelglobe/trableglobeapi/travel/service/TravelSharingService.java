package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelPlaceResponse;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TravelSharingService {
    private final TravelRepository travels;
    public TravelSharingService(TravelRepository travels) { this.travels = travels; }
    public record ShareLink(String token) {}

    public ShareLink status(MemberPrincipal member, Long id) {
        return new ShareLink(travels.findOwned(id, member.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(id)).getShareToken());
    }

    @Transactional
    public ShareLink enable(MemberPrincipal member, Long id) {
        return new ShareLink(ownedForUpdate(member, id).enableSharing());
    }

    @Transactional
    public void disable(MemberPrincipal member, Long id) { ownedForUpdate(member, id).disableSharing(); }

    private Travel ownedForUpdate(MemberPrincipal member, Long id) {
        return travels.findOwnedForSharing(id, member.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(id));
    }

    public TravelDetailResponse shared(String token) {
        Travel travel = travels.findByShareToken(token)
                .orElseThrow(() -> ResourceNotFoundException.travel(0L));
        var detail = TravelDetailResponse.of(travel, List.of(), null, null);
        // Share only the itinerary. Photos, completion state and private planning data stay private.
        var places = detail.places().stream().map(p -> new TravelPlaceResponse(
                p.id(), p.placeName(), p.country(), p.city(), p.latitude(), p.longitude(),
                p.visitedAt(), p.startTime(), p.durationMinutes(), p.memo(), null, p.sortOrder())).toList();
        return new TravelDetailResponse(detail.id(), detail.title(), detail.description(),
                detail.startDate(), detail.endDate(), detail.durationDays(), null, detail.visibility(),
                detail.owner(), detail.countries(), places, List.of(), null, null);
    }
}
