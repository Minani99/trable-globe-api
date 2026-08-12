package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.location.domain.City;
import com.travelglobe.trableglobeapi.location.domain.Country;
import com.travelglobe.trableglobeapi.location.service.LocationResolverService;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import com.travelglobe.trableglobeapi.travel.domain.TravelPlace;
import com.travelglobe.trableglobeapi.travel.dto.OwnedTravelSummaryResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelPhotoWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelPlaceWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelWriteRequest;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Write side of the travel aggregate. Every lookup includes the authenticated owner. */
@Service
public class TravelCommandService {

    private final MemberRepository memberRepository;
    private final TravelRepository travelRepository;
    private final TravelPhotoRepository travelPhotoRepository;
    private final LocationResolverService locationResolverService;

    public TravelCommandService(MemberRepository memberRepository,
                                TravelRepository travelRepository,
                                TravelPhotoRepository travelPhotoRepository,
                                LocationResolverService locationResolverService) {
        this.memberRepository = memberRepository;
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
        this.locationResolverService = locationResolverService;
    }

    @Transactional(readOnly = true)
    public List<OwnedTravelSummaryResponse> findMine(MemberPrincipal principal) {
        List<Travel> travels = travelRepository.findOwnedTravels(principal.memberId());
        if (travels.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> photoCounts = new HashMap<>();
        travelPhotoRepository.countByTravelIds(travels.stream().map(Travel::getId).toList())
                .forEach(row -> photoCounts.put(row.travelId(), row.photoCount()));
        return travels.stream()
                .map(travel -> OwnedTravelSummaryResponse.from(
                        travel, photoCounts.getOrDefault(travel.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public TravelDetailResponse getMine(MemberPrincipal principal, Long travelId) {
        Travel travel = ownedTravel(principal, travelId);
        return TravelDetailResponse.of(
                travel, travelPhotoRepository.findAllForTravel(travelId), null, null);
    }

    @Transactional
    public TravelDetailResponse create(MemberPrincipal principal, TravelWriteRequest request) {
        validateDates(request);
        Member owner = memberRepository.findById(principal.memberId())
                .orElseThrow(() -> ResourceNotFoundException.profile(principal.username()));
        Travel travel = Travel.create(
                owner,
                request.title().trim(),
                emptyToNull(request.description()),
                request.startDate(),
                request.endDate(),
                emptyToNull(request.coverImageUrl()),
                request.visibility());
        travel.replacePlaces(buildPlaces(request.places()));
        Travel saved = travelRepository.saveAndFlush(travel);
        List<TravelPhoto> photos = savePhotos(saved, request.photos());
        return TravelDetailResponse.of(saved, photos, null, null);
    }

    @Transactional
    public TravelDetailResponse update(MemberPrincipal principal, Long travelId, TravelWriteRequest request) {
        validateDates(request);
        Travel travel = ownedTravel(principal, travelId);
        travelPhotoRepository.deleteAllForTravel(travelId);
        travel.updateDetails(
                request.title().trim(),
                emptyToNull(request.description()),
                request.startDate(),
                request.endDate(),
                emptyToNull(request.coverImageUrl()),
                request.visibility());
        travel.replacePlaces(buildPlaces(request.places()));
        Travel saved = travelRepository.saveAndFlush(travel);
        List<TravelPhoto> photos = savePhotos(saved, request.photos());
        return TravelDetailResponse.of(saved, photos, null, null);
    }

    @Transactional
    public void delete(MemberPrincipal principal, Long travelId) {
        travelRepository.delete(ownedTravel(principal, travelId));
    }

    private Travel ownedTravel(MemberPrincipal principal, Long travelId) {
        return travelRepository.findOwnedDetail(travelId, principal.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));
    }

    private List<TravelPlace> buildPlaces(List<TravelPlaceWriteRequest> requests) {
        List<TravelPlace> places = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            TravelPlaceWriteRequest request = requests.get(index);
            Country country = locationResolverService.resolveCountry(request.country());
            City city = locationResolverService.resolveCity(country, request.city());
            places.add(TravelPlace.create(
                    country,
                    city,
                    request.placeName().trim(),
                    request.latitude(),
                    request.longitude(),
                    request.visitedAt(),
                    emptyToNull(request.memo()),
                    index));
        }
        return places;
    }

    private List<TravelPhoto> savePhotos(Travel travel, List<TravelPhotoWriteRequest> requests) {
        List<TravelPhoto> photos = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            TravelPhotoWriteRequest request = requests.get(index);
            TravelPlace place = null;
            if (request.placeIndex() != null) {
                if (request.placeIndex() >= travel.getPlaces().size()) {
                    throw new InvalidRequestException("사진과 연결할 방문 장소를 확인해 주세요.");
                }
                place = travel.getPlaces().get(request.placeIndex());
            }
            photos.add(TravelPhoto.create(
                    travel, place, request.imageUrl().trim(), emptyToNull(request.caption()),
                    request.takenAt(), index));
        }
        return requests.isEmpty() ? List.of() : travelPhotoRepository.saveAll(photos);
    }

    private static void validateDates(TravelWriteRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new InvalidRequestException("여행 종료일은 시작일보다 빠를 수 없습니다.");
        }
        for (TravelPlaceWriteRequest place : request.places()) {
            if (place.visitedAt() != null
                    && (place.visitedAt().isBefore(request.startDate())
                    || place.visitedAt().isAfter(request.endDate()))) {
                throw new InvalidRequestException("방문일은 여행 기간 안에 있어야 합니다.");
            }
        }
    }

    private static String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
