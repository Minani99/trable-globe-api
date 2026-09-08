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
import com.travelglobe.trableglobeapi.travel.domain.TravelPlanningPlaceholder;
import com.travelglobe.trableglobeapi.travel.domain.TravelTask;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.dto.OwnedTravelSummaryResponse;
import com.travelglobe.trableglobeapi.travel.dto.TravelDetailResponse;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelPhotoWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.CreateTravelPhotoInTripRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelPlaceWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.TravelWriteRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.UpdateTravelPlaceInTripRequest;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelTaskRepository;
import java.time.Clock;
import java.time.LocalDate;
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
    private final TravelTaskRepository travelTaskRepository;
    private final TravelPurgeService travelPurgeService;
    private final LocationResolverService locationResolverService;
    private final Clock clock;

    public TravelCommandService(MemberRepository memberRepository,
                                TravelRepository travelRepository,
                                TravelPhotoRepository travelPhotoRepository,
                                TravelTaskRepository travelTaskRepository,
                                TravelPurgeService travelPurgeService,
                                LocationResolverService locationResolverService,
                                Clock clock) {
        this.memberRepository = memberRepository;
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
        this.travelTaskRepository = travelTaskRepository;
        this.travelPurgeService = travelPurgeService;
        this.locationResolverService = locationResolverService;
        this.clock = clock;
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
        if (isUpcomingPlan(request)) {
            travelTaskRepository.saveAll(TravelTask.defaultsFor(saved));
        }
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
    public TravelDetailResponse updatePlaceInTrip(MemberPrincipal principal, Long travelId, Long placeId,
                                                   UpdateTravelPlaceInTripRequest request) {
        Travel travel = ownedTravel(principal, travelId);
        TravelPlace place = ownedPlace(travel, placeId);
        place.updateInTrip(emptyToNull(request.memo()), request.completed());
        return TravelDetailResponse.of(
                travel, travelPhotoRepository.findAllForTravel(travelId), null, null);
    }

    @Transactional
    public TravelDetailResponse addPhotoInTrip(MemberPrincipal principal, Long travelId,
                                                CreateTravelPhotoInTripRequest request) {
        Travel travel = ownedTravel(principal, travelId);
        TravelPlace place = request.travelPlaceId() == null
                ? null
                : ownedPlace(travel, request.travelPlaceId());
        List<TravelPhoto> currentPhotos = travelPhotoRepository.findAllForTravel(travelId);
        TravelPhoto photo = TravelPhoto.create(
                travel,
                place,
                request.imageUrl().trim(),
                emptyToNull(request.caption()),
                request.takenAt(),
                currentPhotos.size());
        travelPhotoRepository.saveAndFlush(photo);
        List<TravelPhoto> photos = new ArrayList<>(currentPhotos);
        photos.add(photo);
        return TravelDetailResponse.of(travel, photos, null, null);
    }

    @Transactional
    public void delete(MemberPrincipal principal, Long travelId) {
        travelPurgeService.purge(ownedTravel(principal, travelId));
    }

    private Travel ownedTravel(MemberPrincipal principal, Long travelId) {
        return travelRepository.findOwnedDetail(travelId, principal.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));
    }

    private static TravelPlace ownedPlace(Travel travel, Long placeId) {
        return travel.getPlaces().stream()
                .filter(place -> place.getId().equals(placeId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("여행 장소를 찾을 수 없습니다: " + placeId));
    }

    private List<TravelPlace> buildPlaces(List<TravelPlaceWriteRequest> requests) {
        List<TravelPlace> places = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            TravelPlaceWriteRequest request = requests.get(index);
            Country country = locationResolverService.resolveCountry(request.country());
            City city = locationResolverService.resolveCity(country, request.city());
            TravelPlace place = TravelPlace.create(
                    country,
                    city,
                    request.placeName().trim(),
                    request.latitude(),
                    request.longitude(),
                    request.visitedAt(),
                    request.startTime(),
                    request.durationMinutes(),
                    emptyToNull(request.memo()),
                    index);
            place.updateInTrip(emptyToNull(request.memo()), Boolean.TRUE.equals(request.completed()));
            places.add(place);
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

    /** A private trip that has not ended yet is a plan, and plans start with a default checklist. */
    private boolean isUpcomingPlan(TravelWriteRequest request) {
        return request.visibility() == Visibility.PRIVATE && !request.endDate().isBefore(today());
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    private void validateDates(TravelWriteRequest request) {
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
        if (request.visibility() == Visibility.PUBLIC) {
            if (request.endDate().isAfter(today())) {
                throw new InvalidRequestException("여행이 끝난 뒤 기록을 공개할 수 있습니다.");
            }
            if (request.places().stream()
                    .anyMatch(place -> TravelPlanningPlaceholder.isPlaceholder(place.placeName()))) {
                throw new InvalidRequestException("미정인 장소를 실제 방문 장소로 바꾼 뒤 기록을 공개해 주세요.");
            }
        }
    }


    private static String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
