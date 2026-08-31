package com.travelglobe.trableglobeapi.social.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.social.domain.MemberBlock;
import com.travelglobe.trableglobeapi.social.domain.MemberFollow;
import com.travelglobe.trableglobeapi.social.domain.MemberReport;
import com.travelglobe.trableglobeapi.social.dto.CreateMemberReportRequest;
import com.travelglobe.trableglobeapi.social.dto.DiscoveryCountryResponse;
import com.travelglobe.trableglobeapi.social.dto.FollowStatusResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberConnectionResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberDiscoveryResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberReportResponse;
import com.travelglobe.trableglobeapi.social.dto.MemberSafetyStatusResponse;
import com.travelglobe.trableglobeapi.social.repository.MemberBlockRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberReportRepository;
import com.travelglobe.trableglobeapi.statistics.dto.TravelStatisticsResponse;
import com.travelglobe.trableglobeapi.statistics.service.TravelStatisticsService;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.projection.CountryVisitProjection;
import java.util.Comparator;
import java.time.Duration;
import java.time.Instant;
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
    private static final Duration REPORT_COOLDOWN = Duration.ofHours(24);

    private final MemberRepository memberRepository;
    private final MemberFollowRepository followRepository;
    private final MemberBlockRepository blockRepository;
    private final MemberReportRepository reportRepository;
    private final TravelRepository travelRepository;
    private final TravelStatisticsService statisticsService;

    public MemberDiscoveryService(MemberRepository memberRepository,
                                  MemberFollowRepository followRepository,
                                  MemberBlockRepository blockRepository,
                                  MemberReportRepository reportRepository,
                                  TravelRepository travelRepository,
                                  TravelStatisticsService statisticsService) {
        this.memberRepository = memberRepository;
        this.followRepository = followRepository;
        this.blockRepository = blockRepository;
        this.reportRepository = reportRepository;
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
                        principal.memberId(), normalizedQuery,
                        PageRequest.of(0, RECOMMENDATION_CANDIDATES)).stream()
                .filter(member -> !blockRepository.existsBetween(principal.memberId(), member.getId()))
                .map(member -> toResponse(principal.memberId(), currentCountries, member))
                .limit(limit)
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
                        principal.memberId(), Visibility.PUBLIC,
                        PageRequest.of(0, RECOMMENDATION_CANDIDATES)).stream()
                .filter(member -> !followRepository.existsByFollowerIdAndFollowingId(
                        principal.memberId(), member.getId()))
                .filter(member -> !blockRepository.existsBetween(principal.memberId(), member.getId()))
                .map(member -> toResponse(principal.memberId(), currentCountries, member))
                .filter(MemberDiscoveryService::hasPublicTravelWorld)
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
                        -1L, Visibility.PUBLIC,
                        PageRequest.of(0, RECOMMENDATION_CANDIDATES)).stream()
                .map(member -> toResponse(null, Set.of(), member))
                .filter(MemberDiscoveryService::hasPublicTravelWorld)
                .sorted(Comparator
                        .comparingLong(MemberDiscoveryResponse::travelCount).reversed()
                        .thenComparing(Comparator.comparingLong(MemberDiscoveryResponse::followerCount).reversed())
                        .thenComparing(MemberDiscoveryResponse::username))
                .limit(normalizeLimit(requestedLimit))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberConnectionResponse> followers(
            MemberPrincipal principal, String username, int requestedLimit) {
        return connections(principal.memberId(), username, requestedLimit, true);
    }

    @Transactional(readOnly = true)
    public List<MemberConnectionResponse> following(
            MemberPrincipal principal, String username, int requestedLimit) {
        return connections(principal.memberId(), username, requestedLimit, false);
    }

    @Transactional(readOnly = true)
    public List<MemberConnectionResponse> publicFollowers(String username, int requestedLimit) {
        return connections(null, username, requestedLimit, true);
    }

    @Transactional(readOnly = true)
    public List<MemberConnectionResponse> publicFollowing(String username, int requestedLimit) {
        return connections(null, username, requestedLimit, false);
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
        if (blockRepository.existsBetween(current.getId(), target.getId())) {
            throw new InvalidRequestException("차단된 사용자와는 팔로우할 수 없습니다.");
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

    @Transactional(readOnly = true)
    public MemberSafetyStatusResponse safetyStatus(MemberPrincipal principal, String username) {
        Member target = requireTarget(username);
        ensureNotSelf(principal.memberId(), target);
        return safetyStatus(principal.memberId(), target.getId());
    }

    @Transactional
    public MemberSafetyStatusResponse block(MemberPrincipal principal, String username) {
        Member current = requireMember(principal.memberId(), principal.username());
        Member target = requireTarget(username);
        ensureNotSelf(current.getId(), target);
        if (!blockRepository.existsByBlockerIdAndBlockedId(current.getId(), target.getId())) {
            blockRepository.saveAndFlush(MemberBlock.create(current, target));
        }
        followRepository.deleteByFollowerIdAndFollowingId(current.getId(), target.getId());
        followRepository.deleteByFollowerIdAndFollowingId(target.getId(), current.getId());
        followRepository.flush();
        return safetyStatus(current.getId(), target.getId());
    }

    @Transactional
    public MemberSafetyStatusResponse unblock(MemberPrincipal principal, String username) {
        Member target = requireTarget(username);
        ensureNotSelf(principal.memberId(), target);
        blockRepository.findByBlockerIdAndBlockedId(principal.memberId(), target.getId())
                .ifPresent(blockRepository::delete);
        blockRepository.flush();
        return safetyStatus(principal.memberId(), target.getId());
    }

    @Transactional
    public MemberReportResponse report(MemberPrincipal principal, String username,
                                       CreateMemberReportRequest request) {
        Member current = requireMember(principal.memberId(), principal.username());
        Member target = requireTarget(username);
        ensureNotSelf(current.getId(), target);
        if (reportRepository.existsByReporterIdAndReportedMemberIdAndCreatedAtAfter(
                current.getId(), target.getId(), Instant.now().minus(REPORT_COOLDOWN))) {
            throw new InvalidRequestException("같은 사용자는 하루에 한 번만 신고할 수 있습니다.");
        }
        String details = StringUtils.hasText(request.details()) ? request.details().trim() : null;
        MemberReport saved = reportRepository.saveAndFlush(
                MemberReport.create(current, target, request.reason(), details));
        return MemberReportResponse.from(saved);
    }

    private MemberDiscoveryResponse toResponse(Long currentMemberId, Set<String> currentCountries, Member member) {
        TravelStatisticsResponse statistics = statisticsService.getPublicStatistics(member.getUsername());
        List<CountryVisitProjection> visitedCountries = travelRepository.findVisitedCountries(
                member.getUsername(), Visibility.PUBLIC);
        long sharedCountries = visitedCountries.stream()
                .map(CountryVisitProjection::iso2Code)
                .filter(currentCountries::contains)
                .count();
        boolean following = currentMemberId != null
                && followRepository.existsByFollowerIdAndFollowingId(currentMemberId, member.getId());
        String reason = sharedCountries > 0
                ? "공통 여행지 " + sharedCountries + "곳"
                : statistics.travelCount() > 0
                        ? "여행 기록 " + statistics.travelCount() + "개"
                        : "새로 합류한 여행자";
        List<DiscoveryCountryResponse> worldCountries = visitedCountries.stream()
                .sorted(Comparator.comparing(
                        CountryVisitProjection::lastVisitedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(DiscoveryCountryResponse::from)
                .toList();
        return MemberDiscoveryResponse.of(
                member,
                statistics.countryCount(),
                statistics.cityCount(),
                statistics.travelCount(),
                followRepository.countByFollowingId(member.getId()),
                following,
                sharedCountries,
                reason,
                recentDestinations(member.getUsername()),
                worldCountries);
    }

    private List<String> recentDestinations(String username) {
        return travelRepository.findProfileTravels(username, Visibility.PUBLIC).stream()
                .flatMap(travel -> travel.getPlaces().stream())
                .map(place -> place.getCity() == null
                        ? preferredName(place.getCountry().getNameKo(), place.getCountry().getNameEn())
                        : preferredName(place.getCity().getNameKo(), place.getCity().getNameEn()))
                .filter(StringUtils::hasText)
                .distinct()
                .limit(3)
                .toList();
    }

    private static String preferredName(String korean, String english) {
        if (StringUtils.hasText(korean)) {
            return korean.trim();
        }
        return StringUtils.hasText(english) ? english.trim() : "기록된 장소";
    }

    private static boolean hasPublicTravelWorld(MemberDiscoveryResponse member) {
        return member.travelCount() > 0 && member.countryCount() > 0 && !member.worldCountries().isEmpty();
    }

    private List<MemberConnectionResponse> connections(
            Long currentMemberId, String username, int requestedLimit, boolean followers) {
        Member target = requireTarget(username);
        List<Member> members = followers
                ? followRepository.findFollowers(target.getId(), PageRequest.of(0, normalizeLimit(requestedLimit)))
                : followRepository.findFollowing(target.getId(), PageRequest.of(0, normalizeLimit(requestedLimit)));
        return members.stream()
                .filter(member -> currentMemberId == null
                        || !blockRepository.existsBetween(currentMemberId, member.getId()))
                .map(member -> MemberConnectionResponse.of(
                        member,
                        followRepository.countByFollowingId(member.getId()),
                        currentMemberId != null
                                && !currentMemberId.equals(member.getId())
                                && followRepository.existsByFollowerIdAndFollowingId(
                                        currentMemberId, member.getId()),
                        currentMemberId != null && currentMemberId.equals(member.getId())))
                .toList();
    }

    private FollowStatusResponse followStatus(Long currentMemberId, Member target) {
        return new FollowStatusResponse(
                !currentMemberId.equals(target.getId())
                        && followRepository.existsByFollowerIdAndFollowingId(currentMemberId, target.getId()),
                followRepository.countByFollowingId(target.getId()),
                followRepository.countByFollowerId(target.getId()));
    }

    private MemberSafetyStatusResponse safetyStatus(Long currentMemberId, Long targetMemberId) {
        boolean blockedByCurrentMember = blockRepository.existsByBlockerIdAndBlockedId(
                currentMemberId, targetMemberId);
        return new MemberSafetyStatusResponse(
                blockedByCurrentMember,
                blockedByCurrentMember || blockRepository.existsByBlockerIdAndBlockedId(
                        targetMemberId, currentMemberId));
    }

    private static void ensureNotSelf(Long currentMemberId, Member target) {
        if (currentMemberId.equals(target.getId())) {
            throw new InvalidRequestException("내 프로필에는 사용할 수 없는 기능입니다.");
        }
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
