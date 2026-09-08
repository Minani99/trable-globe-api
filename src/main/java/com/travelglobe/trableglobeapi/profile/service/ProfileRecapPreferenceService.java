package com.travelglobe.trableglobeapi.profile.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.member.service.MemberService;
import com.travelglobe.trableglobeapi.profile.domain.ProfileRecapPreference;
import com.travelglobe.trableglobeapi.profile.dto.ProfileRecapPreferenceResponse;
import com.travelglobe.trableglobeapi.profile.dto.UpdateProfileRecapPreferenceRequest;
import com.travelglobe.trableglobeapi.profile.repository.ProfileRecapPreferenceRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class ProfileRecapPreferenceService {

    private final ProfileRecapPreferenceRepository preferenceRepository;
    private final MemberRepository memberRepository;
    private final MemberService memberService;
    private final TravelRepository travelRepository;

    public ProfileRecapPreferenceService(
            ProfileRecapPreferenceRepository preferenceRepository,
            MemberRepository memberRepository,
            MemberService memberService,
            TravelRepository travelRepository) {
        this.preferenceRepository = preferenceRepository;
        this.memberRepository = memberRepository;
        this.memberService = memberService;
        this.travelRepository = travelRepository;
    }

    /** Returns only choices that still point at public travels in the matching year. */
    public List<ProfileRecapPreferenceResponse> findPublic(String username) {
        Member member = memberService.getByUsername(username);
        List<Travel> publicTravels = travelRepository.findProfileTravels(
                member.getUsername(), Visibility.PUBLIC);
        Map<Long, Travel> publicById = new HashMap<>();
        publicTravels.forEach(travel -> publicById.put(travel.getId(), travel));

        return preferenceRepository.findByMemberIdOrderByRecapYearDesc(member.getId()).stream()
                .filter(preference -> publicTravels.stream()
                        .anyMatch(travel -> travel.getStartDate().getYear() == preference.getRecapYear()))
                .map(preference -> response(preference, publicById))
                .toList();
    }

    @Transactional
    public ProfileRecapPreferenceResponse update(
            MemberPrincipal principal,
            int year,
            UpdateProfileRecapPreferenceRequest request) {
        validateYear(year);
        Member member = memberRepository.findById(principal.memberId())
                .orElseThrow(() -> new InvalidRequestException("계정 정보를 찾을 수 없습니다."));
        List<Long> featuredIds = uniqueIds(request.featuredTravelIds());
        Map<Long, Travel> ownedPublicById = new HashMap<>();
        travelRepository.findOwnedTravels(member.getId()).stream()
                .filter(Travel::isPublic)
                .filter(travel -> travel.getStartDate().getYear() == year)
                .forEach(travel -> ownedPublicById.put(travel.getId(), travel));
        if (ownedPublicById.isEmpty()) {
            throw new InvalidRequestException("선택한 연도에 공개 여행이 없습니다.");
        }
        if (!ownedPublicById.keySet().containsAll(featuredIds)) {
            throw new InvalidRequestException("해당 연도의 공개 여행만 대표 장면으로 선택할 수 있습니다.");
        }

        ProfileRecapPreference preference = preferenceRepository
                .findByMemberIdAndRecapYear(member.getId(), year)
                .orElseGet(() -> ProfileRecapPreference.create(member, year));
        preference.update(normalizeNarrative(request.narrative()), serialize(featuredIds));
        ProfileRecapPreference saved = preferenceRepository.save(preference);
        return response(saved, ownedPublicById);
    }

    @Transactional
    public void delete(MemberPrincipal principal, int year) {
        validateYear(year);
        preferenceRepository.findByMemberIdAndRecapYear(principal.memberId(), year)
                .ifPresent(preferenceRepository::delete);
    }

    private static ProfileRecapPreferenceResponse response(
            ProfileRecapPreference preference,
            Map<Long, Travel> visibleById) {
        List<Long> ids = parse(preference.getFeaturedTravelIds()).stream()
                .filter(id -> {
                    Travel travel = visibleById.get(id);
                    return travel != null && travel.getStartDate().getYear() == preference.getRecapYear();
                })
                .toList();
        return new ProfileRecapPreferenceResponse(
                preference.getRecapYear(), preference.getNarrative(), ids);
    }

    private static List<Long> uniqueIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        Set<Long> unique = new LinkedHashSet<>(ids);
        if (unique.size() != ids.size()) {
            throw new InvalidRequestException("같은 여행을 중복 선택할 수 없습니다.");
        }
        return List.copyOf(unique);
    }

    private static String normalizeNarrative(String narrative) {
        return StringUtils.hasText(narrative) ? narrative.trim() : null;
    }

    private static String serialize(List<Long> ids) {
        return ids.isEmpty() ? null : ids.stream().map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
    }

    private static List<Long> parse(String value) {
        if (!StringUtils.hasText(value)) return List.of();
        List<Long> ids = new ArrayList<>();
        for (String token : value.split(",")) {
            try {
                ids.add(Long.valueOf(token));
            } catch (NumberFormatException ignored) {
                // Ignore one malformed legacy token without hiding the rest of the recap.
            }
        }
        return List.copyOf(ids);
    }

    private static void validateYear(int year) {
        if (year < 1900 || year > 2100) {
            throw new InvalidRequestException("연도는 1900년부터 2100년 사이여야 합니다.");
        }
    }
}
