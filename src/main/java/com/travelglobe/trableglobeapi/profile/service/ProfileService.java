package com.travelglobe.trableglobeapi.profile.service;

import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.location.repository.CountryRepository;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.service.MemberService;
import com.travelglobe.trableglobeapi.profile.dto.ProfileResponse;
import com.travelglobe.trableglobeapi.profile.dto.VisitedCountryResponse;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.statistics.service.TravelStatisticsService;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.dto.TravelSummaryResponse;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.service.TravelQueryService;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read facade for everything a public profile page shows.
 *
 * <p>The profile is the only aggregate the frontend addresses, but the data it needs
 * spans member, travel, location and statistics. Rather than have one of those domains
 * reach into the others, this service composes them - so each domain package stays
 * about its own concern and the cross-domain read model lives in one obvious place.
 *
 * <p>Every method resolves the member first: an unknown handle must be a 404, not an
 * empty list that looks like a traveller who has been nowhere.
 */
@Service
@Transactional(readOnly = true)
public class ProfileService {

    private static final Pattern ISO2_PATTERN = Pattern.compile("^[A-Za-z]{2}$");

    private final MemberService memberService;
    private final TravelQueryService travelQueryService;
    private final TravelStatisticsService travelStatisticsService;
    private final TravelRepository travelRepository;
    private final CountryRepository countryRepository;
    private final MemberFollowRepository followRepository;

    public ProfileService(MemberService memberService,
                          TravelQueryService travelQueryService,
                          TravelStatisticsService travelStatisticsService,
                          TravelRepository travelRepository,
                          CountryRepository countryRepository,
                          MemberFollowRepository followRepository) {
        this.memberService = memberService;
        this.travelQueryService = travelQueryService;
        this.travelStatisticsService = travelStatisticsService;
        this.travelRepository = travelRepository;
        this.countryRepository = countryRepository;
        this.followRepository = followRepository;
    }

    public ProfileResponse getProfile(String username) {
        Member member = memberService.getByUsername(username);
        return ProfileResponse.of(
                member,
                travelStatisticsService.getPublicStatistics(member.getUsername()),
                followRepository.countByFollowingId(member.getId()),
                followRepository.countByFollowerId(member.getId()));
    }

    public TravelStatisticsResponse getStatistics(String username) {
        Member member = memberService.getByUsername(username);
        return travelStatisticsService.getPublicStatistics(member.getUsername());
    }

    /** Countries the member has visited, most visited first - the globe's marker source. */
    public List<VisitedCountryResponse> getVisitedCountries(String username) {
        Member member = memberService.getByUsername(username);
        return travelRepository.findVisitedCountries(member.getUsername(), Visibility.PUBLIC).stream()
                .map(VisitedCountryResponse::from)
                .toList();
    }

    public List<TravelSummaryResponse> getTravels(String username) {
        Member member = memberService.getByUsername(username);
        return travelQueryService.findPublicTravels(member.getUsername());
    }

    /**
     * Trips that touched one country.
     *
     * @param countryCode ISO 3166-1 alpha-2, case insensitive
     * @throws ResourceNotFoundException when the code is not a country we know
     */
    public List<TravelSummaryResponse> getTravelsByCountry(String username, String countryCode) {
        Member member = memberService.getByUsername(username);
        String iso2Code = normalizeCountryCode(countryCode);

        if (!countryRepository.existsByIso2Code(iso2Code)) {
            throw ResourceNotFoundException.country(countryCode);
        }
        return travelQueryService.findPublicTravelsByCountry(member.getUsername(), iso2Code);
    }

    private static String normalizeCountryCode(String countryCode) {
        if (countryCode == null || !ISO2_PATTERN.matcher(countryCode).matches()) {
            throw new InvalidRequestException("국가 코드는 2자리 ISO 코드여야 합니다: " + countryCode);
        }
        return countryCode.toUpperCase(Locale.ROOT);
    }
}
