package com.travelglobe.trableglobeapi.social.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.social.domain.MemberFollow;
import com.travelglobe.trableglobeapi.social.dto.FollowStatusResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberDiscoveryResponse;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.statistics.service.TravelStatisticsService;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MemberDiscoveryService {

    private static final int MAX_RESULTS = 24;
    private static final int RECOMMENDATION_CANDIDATES = 48;

    private final MemberRepository memberRepository;
    private final MemberFollowRepository followRepository;
    private final TravelRepository travelRepository;
    private final TravelStatisticsService statisticsService;

    public MemberDiscoveryService(MemberRepository memberRepository,
                                  MemberFollowRepository followRepository,
                                  TravelRepository travelRepository,
                                  TravelStatisticsService statisticsService) {
        this.memberRepository = memberRepository;
        this.followRepository = followRepository;
        this.travelRepository = travelRepository;
        this.statisticsService = statisticsService;
    }

    @Transactional(readOnly = true)
    public List<MemberDiscoveryResponse> search(MemberPrincipal principal, String query, int requestedLimit) {
        String normalizedQuery = validateQuery(query);
        if (!StringUtils.hasText(normalizedQuery)) {
            return List.of();
        }
        int limit = normalizeLimit(requestedLimit);
        Set<String> currentCountries = visitedCountryCodes(principal.username());
        return memberRepository.searchDiscoverableMembers(
                        principal.memberId(), normalizedQuery, PageRequest.of(0, limit)).stream()
                .map(member -> toResponse(principal.memberId(), currentCountries, member))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberDiscoveryResponse> publicSearch(String query, int requestedLimit) {
        String normalizedQuery = validateQuery(query);
        if (!StringUtils.hasText(normalizedQuery)) {
            return List.of();
        }
        return memberRepository.searchDiscoverableMembers(
                        -1L, normalizedQuery, PageRequest.of(0, normalizeLimit(requestedLimit))).stream()
                .map(member -> toResponse(null, Set.of(), member))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberDiscoveryResponse> recommendations(MemberPrincipal principal, int requestedLimit) {
        int limit = normalizeLimit(requestedLimit);
        Set<String> currentCountries = visitedCountryCodes(principal.username());
        return memberRepository.findDiscoveryCandidates(
                        principal.memberId(), PageRequest.of(0, RECOMMENDATION_CANDIDATES)).stream()
                .filter(member -> !followRepository.existsByFollowerIdAndFollowingId(
                        principal.memberId(), member.getId()))
                .map(member -> toResponse(principal.memberId(), currentCountries, member))
                .sorted(Comparator
                        .comparingLong(MemberDiscoveryResponse::sharedCountryCount).reversed()
                        .thenComparing(Comparator.comparingLong(MemberDiscoveryResponse::travelCount).reversed())
                        .thenComparing(Comparator.comparingLong(MemberDiscoveryResponse::followerCount).reversed())
                        .thenComparing(MemberDiscoveryResponse::username))
                .limit(limit)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberDiscoveryResponse> publicRecommendations(int requestedLimit) {
        return memberRepository.findDiscoveryCandidates(
                        -1L, PageRequest.of(0, RECOMMENDATION_CANDIDATES)).stream()
                .map(member -> toResponse(null, Set.of(), member))
                .sorted(Comparator
                        .comparingLong(MemberDiscoveryResponse::travelCount).reversed()
                        .thenComparing(Comparator.comparingLong(MemberDiscoveryResponse::followerCount).reversed())
                        .thenComparing(MemberDiscoveryResponse::username))
                .limit(normalizeLimit(requestedLimit))
                .toList();
    }

    @Transactional(readOnly = true)
    public FollowStatusResponse status(MemberPrincipal principal, String username) {
        Member target = requireTarget(username);
        return followStatus(principal.memberId(), target);
    }

    @Transactional
    public FollowStatusResponse follow(MemberPrincipal principal, String username) {
        Member current = requireMember(principal.memberId(), principal.username());
        Member target = requireTarget(username);
        if (current.getId().equals(target.getId())) {
            throw new InvalidRequestException("내 프로필은 팔로우할 수 없습니다.");
        }
        if (!followRepository.existsByFollowerIdAndFollowingId(current.getId(), target.getId())) {
            followRepository.saveAndFlush(MemberFollow.create(current, target));
        }
        return followStatus(current.getId(), target);
    }

    @Transactional
    public FollowStatusResponse unfollow(MemberPrincipal principal, String username) {
        Member target = requireTarget(username);
        followRepository.findByFollowerIdAndFollowingId(principal.memberId(), target.getId())
                .ifPresent(followRepository::delete);
        followRepository.flush();
        return followStatus(principal.memberId(), target);
    }

    private MemberDiscoveryResponse toResponse(Long currentMemberId, Set<String> currentCountries, Member member) {
        TravelStatisticsResponse statistics = statisticsService.getPublicStatistics(member.getUsername());
        long sharedCountries = visitedCountryCodes(member.getUsername()).stream()
                .filter(currentCountries::contains)
                .count();
        boolean following = currentMemberId != null
                && followRepository.existsByFollowerIdAndFollowingId(currentMemberId, member.getId());
        String reason = sharedCountries > 0
                ? "공통 여행지 " + sharedCountries + "곳"
                : statistics.travelCount() > 0
                        ? "여행 기록 " + statistics.travelCount() + "개"
                        : "새로 합류한 여행자";
        return MemberDiscoveryResponse.of(
                member,
                statistics.countryCount(),
                statistics.travelCount(),
                followRepository.countByFollowingId(member.getId()),
                following,
                sharedCountries,
                reason);
    }

    private FollowStatusResponse followStatus(Long currentMemberId, Member target) {
        return new FollowStatusResponse(
                !currentMemberId.equals(target.getId())
                        && followRepository.existsByFollowerIdAndFollowingId(currentMemberId, target.getId()),
                followRepository.countByFollowingId(target.getId()),
                followRepository.countByFollowerId(target.getId()));
    }

    private Set<String> visitedCountryCodes(String username) {
        return travelRepository.findVisitedCountries(username, Visibility.PUBLIC).stream()
                .map(country -> country.iso2Code())
                .collect(Collectors.toSet());
    }

    private Member requireTarget(String username) {
        String normalized = Member.normalizeUsername(username);
        if (!StringUtils.hasText(normalized) || normalized.length() > Member.USERNAME_MAX_LENGTH) {
            throw new InvalidRequestException("올바른 사용자명을 입력해 주세요.");
        }
        return memberRepository.findByUsername(normalized)
                .orElseThrow(() -> ResourceNotFoundException.profile(username));
    }

    private Member requireMember(Long memberId, String username) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> ResourceNotFoundException.profile(username));
    }

    private static int normalizeLimit(int requestedLimit) {
        return Math.max(1, Math.min(requestedLimit, MAX_RESULTS));
    }

    private static String validateQuery(String query) {
        String normalized = query == null ? "" : query.trim();
        if (normalized.length() > 60) {
            throw new InvalidRequestException("검색어는 60자 이내로 입력해 주세요.");
        }
        return normalized;
    }
}
