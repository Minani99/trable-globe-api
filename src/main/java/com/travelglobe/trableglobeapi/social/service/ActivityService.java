package com.travelglobe.trableglobeapi.social.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.social.domain.MemberFollow;
import com.travelglobe.trableglobeapi.social.domain.TravelComment;
import com.travelglobe.trableglobeapi.social.domain.TravelLike;
import com.travelglobe.trableglobeapi.social.dto.ActivityEventResponse;
import com.travelglobe.trableglobeapi.social.dto.SocialAuthorResponse;
import com.travelglobe.trableglobeapi.social.repository.MemberBlockRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelCommentRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelLikeRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {

    private final MemberFollowRepository followRepository;
    private final TravelLikeRepository likeRepository;
    private final TravelCommentRepository commentRepository;
    private final MemberBlockRepository blockRepository;

    public ActivityService(MemberFollowRepository followRepository,
                           TravelLikeRepository likeRepository,
                           TravelCommentRepository commentRepository,
                           MemberBlockRepository blockRepository) {
        this.followRepository = followRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.blockRepository = blockRepository;
    }

    @Transactional(readOnly = true)
    public List<ActivityEventResponse> recent(MemberPrincipal principal, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 30));
        PageRequest page = PageRequest.of(0, Math.min(limit * 2, 40));
        List<ActivityEventResponse> events = new ArrayList<>();

        for (MemberFollow follow : followRepository.findRecentFollowerEvents(principal.memberId(), page)) {
            if (!blocked(principal.memberId(), follow.getFollower().getId())) {
                events.add(new ActivityEventResponse(
                        "follow-" + follow.getId(),
                        "FOLLOW",
                        SocialAuthorResponse.from(follow.getFollower()),
                        null,
                        null,
                        null,
                        follow.getCreatedAt()));
            }
        }
        for (TravelLike like : likeRepository.findRecentForTravelOwner(principal.memberId(), page)) {
            if (!blocked(principal.memberId(), like.getMember().getId())) {
                events.add(new ActivityEventResponse(
                        "like-" + like.getId(),
                        "LIKE",
                        SocialAuthorResponse.from(like.getMember()),
                        like.getTravel().getId(),
                        like.getTravel().getTitle(),
                        null,
                        like.getCreatedAt()));
            }
        }
        for (TravelComment comment : commentRepository.findRecentForTravelOwner(principal.memberId(), page)) {
            if (!blocked(principal.memberId(), comment.getMember().getId())) {
                events.add(new ActivityEventResponse(
                        "comment-" + comment.getId(),
                        "COMMENT",
                        SocialAuthorResponse.from(comment.getMember()),
                        comment.getTravel().getId(),
                        comment.getTravel().getTitle(),
                        comment.getContent(),
                        comment.getCreatedAt()));
            }
        }

        return events.stream()
                .sorted(Comparator.comparing(ActivityEventResponse::createdAt, Comparator.nullsLast(
                        Comparator.<Instant>naturalOrder())).reversed())
                .limit(limit)
                .toList();
    }

    private boolean blocked(Long currentMemberId, Long actorId) {
        return blockRepository.existsBetween(currentMemberId, actorId);
    }
}
