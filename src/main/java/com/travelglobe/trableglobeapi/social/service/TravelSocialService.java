package com.travelglobe.trableglobeapi.social.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.AccessDeniedException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.social.domain.TravelComment;
import com.travelglobe.trableglobeapi.social.domain.TravelLike;
import com.travelglobe.trableglobeapi.social.dto.TravelCommentResponse;
import com.travelglobe.trableglobeapi.social.dto.TravelSocialResponse;
import com.travelglobe.trableglobeapi.social.repository.TravelCommentRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelLikeRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TravelSocialService {

    private static final int MAX_VISIBLE_COMMENTS = 100;

    private final TravelRepository travelRepository;
    private final MemberRepository memberRepository;
    private final TravelLikeRepository likeRepository;
    private final TravelCommentRepository commentRepository;

    public TravelSocialService(TravelRepository travelRepository,
                               MemberRepository memberRepository,
                               TravelLikeRepository likeRepository,
                               TravelCommentRepository commentRepository) {
        this.travelRepository = travelRepository;
        this.memberRepository = memberRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional(readOnly = true)
    public TravelSocialResponse getPublic(Long travelId) {
        requirePublicTravel(travelId);
        return response(travelId, null, null);
    }

    @Transactional(readOnly = true)
    public TravelSocialResponse getForMember(MemberPrincipal principal, Long travelId) {
        Travel travel = requirePublicTravel(travelId);
        return response(travelId, principal.memberId(), travel.getMember().getId());
    }

    @Transactional
    public TravelSocialResponse toggleLike(MemberPrincipal principal, Long travelId) {
        Travel travel = requirePublicTravel(travelId);
        likeRepository.findByTravelIdAndMemberId(travelId, principal.memberId())
                .ifPresentOrElse(
                        likeRepository::delete,
                        () -> likeRepository.save(TravelLike.create(
                                travel, requireMember(principal.memberId(), principal.username()))));
        likeRepository.flush();
        return response(travelId, principal.memberId(), travel.getMember().getId());
    }

    @Transactional
    public TravelSocialResponse addComment(MemberPrincipal principal, Long travelId, String content) {
        Travel travel = requirePublicTravel(travelId);
        Member member = requireMember(principal.memberId(), principal.username());
        commentRepository.saveAndFlush(TravelComment.create(travel, member, content.trim()));
        return response(travelId, principal.memberId(), travel.getMember().getId());
    }

    @Transactional
    public TravelSocialResponse deleteComment(MemberPrincipal principal, Long travelId, Long commentId) {
        Travel travel = requirePublicTravel(travelId);
        TravelComment comment = commentRepository.findById(commentId)
                .filter(found -> found.getTravel().getId().equals(travelId))
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다: " + commentId));
        boolean author = comment.getMember().getId().equals(principal.memberId());
        boolean travelOwner = travel.getMember().getId().equals(principal.memberId());
        if (!author && !travelOwner) {
            throw new AccessDeniedException("이 댓글을 삭제할 권한이 없습니다.");
        }
        commentRepository.delete(comment);
        commentRepository.flush();
        return response(travelId, principal.memberId(), travel.getMember().getId());
    }

    private TravelSocialResponse response(Long travelId, Long currentMemberId, Long ownerId) {
        List<TravelComment> latest = new ArrayList<>(commentRepository.findLatest(
                travelId, PageRequest.of(0, MAX_VISIBLE_COMMENTS)));
        Collections.reverse(latest);
        List<TravelCommentResponse> comments = latest.stream()
                .map(comment -> TravelCommentResponse.from(
                        comment,
                        currentMemberId != null && (comment.getMember().getId().equals(currentMemberId)
                                || ownerId != null && ownerId.equals(currentMemberId))))
                .toList();
        return new TravelSocialResponse(
                likeRepository.countByTravelId(travelId),
                currentMemberId != null && likeRepository.existsByTravelIdAndMemberId(travelId, currentMemberId),
                commentRepository.countByTravelId(travelId),
                comments);
    }

    private Travel requirePublicTravel(Long travelId) {
        return travelRepository.findByIdAndVisibility(travelId, Visibility.PUBLIC)
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));
    }

    private Member requireMember(Long memberId, String username) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> ResourceNotFoundException.profile(username));
    }
}
