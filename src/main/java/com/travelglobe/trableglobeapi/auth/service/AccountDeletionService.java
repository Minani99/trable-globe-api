package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import com.travelglobe.trableglobeapi.auth.repository.AccountActionTokenRepository;
import com.travelglobe.trableglobeapi.auth.repository.MemberCredentialRepository;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.profile.repository.ProfileRecapPreferenceRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberBlockRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberReportRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelCommentRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelLikeRepository;
import com.travelglobe.trableglobeapi.travel.service.TravelPurgeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Removes a member and every row that references them.
 *
 * <p>Deletion order matters: rows that point at the member (follows, blocks, reports,
 * reactions) go first, then the member's own content, then credentials, then the member row.
 * Everything runs in one transaction - a failure halfway leaves the account intact rather
 * than half-deleted. Password verification is the caller's job ({@link AuthService}).
 */
@Service
public class AccountDeletionService {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletionService.class);

    private final MemberRepository memberRepository;
    private final MemberCredentialRepository credentialRepository;
    private final AccountActionTokenRepository actionTokenRepository;
    private final MemberFollowRepository memberFollowRepository;
    private final MemberBlockRepository memberBlockRepository;
    private final MemberReportRepository memberReportRepository;
    private final TravelLikeRepository travelLikeRepository;
    private final TravelCommentRepository travelCommentRepository;
    private final TravelPurgeService travelPurgeService;
    private final ProfileRecapPreferenceRepository recapPreferenceRepository;
    private final AuthSessionService authSessionService;

    public AccountDeletionService(MemberRepository memberRepository,
                                  MemberCredentialRepository credentialRepository,
                                  AccountActionTokenRepository actionTokenRepository,
                                  MemberFollowRepository memberFollowRepository,
                                  MemberBlockRepository memberBlockRepository,
                                  MemberReportRepository memberReportRepository,
                                  TravelLikeRepository travelLikeRepository,
                                  TravelCommentRepository travelCommentRepository,
                                  TravelPurgeService travelPurgeService,
                                  ProfileRecapPreferenceRepository recapPreferenceRepository,
                                  AuthSessionService authSessionService) {
        this.memberRepository = memberRepository;
        this.credentialRepository = credentialRepository;
        this.actionTokenRepository = actionTokenRepository;
        this.memberFollowRepository = memberFollowRepository;
        this.memberBlockRepository = memberBlockRepository;
        this.memberReportRepository = memberReportRepository;
        this.travelLikeRepository = travelLikeRepository;
        this.travelCommentRepository = travelCommentRepository;
        this.travelPurgeService = travelPurgeService;
        this.recapPreferenceRepository = recapPreferenceRepository;
        this.authSessionService = authSessionService;
    }

    @Transactional
    public void delete(MemberCredential credential) {
        Long memberId = credential.getMember().getId();

        // 1. Social graph rows that reference this member.
        memberFollowRepository.deleteAllByFollowerIdOrFollowingId(memberId, memberId);
        memberBlockRepository.deleteAllForMember(memberId);
        memberReportRepository.deleteAllForMember(memberId);

        // 2. Reactions this member left on other people's trips.
        travelLikeRepository.deleteAllByMemberId(memberId);
        travelCommentRepository.deleteAllByMemberId(memberId);

        // 3. The member's own trips (and reactions others left on them).
        int travels = travelPurgeService.purgeAllOwnedBy(memberId);
        recapPreferenceRepository.deleteAllByMemberId(memberId);

        // 4. Authentication state, then the identity itself.
        actionTokenRepository.deleteAllForCredential(credential.getId());
        authSessionService.deleteAll(memberId);
        credentialRepository.delete(credential);
        memberRepository.delete(credential.getMember());

        log.info("Deleted account member id={} travels={}", memberId, travels);
    }
}

