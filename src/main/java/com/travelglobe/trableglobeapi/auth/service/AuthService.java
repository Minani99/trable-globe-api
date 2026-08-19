package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.domain.AccountActionPurpose;
import com.travelglobe.trableglobeapi.auth.domain.AccountActionToken;
import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import com.travelglobe.trableglobeapi.auth.dto.AccountActionResponse;
import com.travelglobe.trableglobeapi.auth.dto.AuthMemberResponse;
import com.travelglobe.trableglobeapi.auth.dto.AuthSessionResponse;
import com.travelglobe.trableglobeapi.auth.dto.DeleteAccountRequest;
import com.travelglobe.trableglobeapi.auth.dto.ForgotPasswordRequest;
import com.travelglobe.trableglobeapi.auth.dto.LoginRequest;
import com.travelglobe.trableglobeapi.auth.dto.RegisterRequest;
import com.travelglobe.trableglobeapi.auth.dto.ResetPasswordRequest;
import com.travelglobe.trableglobeapi.auth.dto.TokenRequest;
import com.travelglobe.trableglobeapi.auth.dto.UpdateProfileRequest;
import com.travelglobe.trableglobeapi.auth.repository.AccountActionTokenRepository;
import com.travelglobe.trableglobeapi.auth.repository.MemberCredentialRepository;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.auth.security.PasswordHasher;
import com.travelglobe.trableglobeapi.global.exception.AuthenticationFailedException;
import com.travelglobe.trableglobeapi.global.exception.ConflictException;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelCommentRepository;
import com.travelglobe.trableglobeapi.social.repository.TravelLikeRepository;
import com.travelglobe.trableglobeapi.social.repository.MemberFollowRepository;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.repository.TravelPhotoRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private static final Duration VERIFICATION_LIFETIME = Duration.ofHours(24);
    private static final Duration RESET_LIFETIME = Duration.ofHours(1);
    private static final String RESET_SENT_MESSAGE =
            "가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다.";

    private final MemberRepository memberRepository;
    private final MemberCredentialRepository credentialRepository;
    private final AccountActionTokenRepository actionTokenRepository;
    private final TravelRepository travelRepository;
    private final TravelPhotoRepository travelPhotoRepository;
    private final TravelLikeRepository travelLikeRepository;
    private final TravelCommentRepository travelCommentRepository;
    private final MemberFollowRepository memberFollowRepository;
    private final AuthSessionService authSessionService;
    private final AccountActionTokenService actionTokenService;
    private final AccountMailService accountMailService;
    private final PasswordHasher passwordHasher;
    private final String dummyPasswordHash;
    private final boolean exposeActionTokens;

    public AuthService(MemberRepository memberRepository,
                       MemberCredentialRepository credentialRepository,
                       AccountActionTokenRepository actionTokenRepository,
                       TravelRepository travelRepository,
                       TravelPhotoRepository travelPhotoRepository,
                       TravelLikeRepository travelLikeRepository,
                       TravelCommentRepository travelCommentRepository,
                       MemberFollowRepository memberFollowRepository,
                       AuthSessionService authSessionService,
                       AccountActionTokenService actionTokenService,
                       AccountMailService accountMailService,
                       PasswordHasher passwordHasher,
                       @Value("${travel-globe.auth.expose-action-tokens:false}") boolean exposeActionTokens) {
        this.memberRepository = memberRepository;
        this.credentialRepository = credentialRepository;
        this.actionTokenRepository = actionTokenRepository;
        this.travelRepository = travelRepository;
        this.travelPhotoRepository = travelPhotoRepository;
        this.travelLikeRepository = travelLikeRepository;
        this.travelCommentRepository = travelCommentRepository;
        this.memberFollowRepository = memberFollowRepository;
        this.authSessionService = authSessionService;
        this.actionTokenService = actionTokenService;
        this.accountMailService = accountMailService;
        this.passwordHasher = passwordHasher;
        this.exposeActionTokens = exposeActionTokens;
        this.dummyPasswordHash = passwordHasher.hash("timing-only-password");
    }

    @Transactional
    public AuthSessionResponse register(RegisterRequest request) {
        String username = Member.normalizeUsername(request.username());
        String email = normalizeEmail(request.email());
        validatePasswordBytes(request.password());
        if (memberRepository.existsByUsername(username)) throw new ConflictException("이미 사용 중인 사용자명입니다.");
        if (credentialRepository.existsByEmail(email)) throw new ConflictException("이미 가입된 이메일입니다.");

        Member member = memberRepository.save(Member.create(username, request.displayName().trim(), null, null));
        MemberCredential credential = credentialRepository.save(MemberCredential.create(
                member, email, passwordHasher.hash(request.password())));
        sendVerification(credential);
        return issue(credential);
    }

    @Transactional
    public AuthSessionResponse login(LoginRequest request) {
        Optional<MemberCredential> found = credentialRepository.findByEmailWithMember(normalizeEmail(request.email()));
        boolean matches = passwordHasher.matches(
                request.password(), found.map(MemberCredential::getPasswordHash).orElse(dummyPasswordHash));
        if (found.isEmpty() || !matches) throw new AuthenticationFailedException();
        return issue(found.orElseThrow());
    }

    @Transactional(readOnly = true)
    public AuthMemberResponse getCurrentMember(MemberPrincipal principal) {
        return AuthMemberResponse.from(getCredential(principal.memberId()));
    }

    @Transactional
    public AuthMemberResponse updateProfile(MemberPrincipal principal, UpdateProfileRequest request) {
        MemberCredential credential = getCredential(principal.memberId());
        credential.getMember().updateProfile(
                request.displayName().trim(), emptyToNull(request.bio()), emptyToNull(request.profileImageUrl()));
        return AuthMemberResponse.from(credential);
    }

    @Transactional
    public AccountActionResponse requestEmailVerification(MemberPrincipal principal) {
        MemberCredential credential = getCredential(principal.memberId());
        if (credential.isEmailVerified()) {
            return new AccountActionResponse("이미 인증된 이메일입니다.", null, null);
        }
        AccountActionTokenService.IssuedToken token = sendVerification(credential);
        return actionResponse("인증 메일을 보냈습니다.", token);
    }

    @Transactional
    public AuthMemberResponse confirmEmail(TokenRequest request) {
        AccountActionToken token = actionTokenService.consume(request.token(), AccountActionPurpose.VERIFY_EMAIL);
        token.getCredential().verifyEmail(java.time.Instant.now());
        return AuthMemberResponse.from(token.getCredential());
    }

    @Transactional
    public AccountActionResponse requestPasswordReset(ForgotPasswordRequest request) {
        Optional<MemberCredential> found = credentialRepository.findByEmailWithMember(normalizeEmail(request.email()));
        if (found.isEmpty()) return new AccountActionResponse(RESET_SENT_MESSAGE, null, null);
        MemberCredential credential = found.orElseThrow();
        AccountActionTokenService.IssuedToken token = actionTokenService.issue(
                credential, AccountActionPurpose.RESET_PASSWORD, RESET_LIFETIME);
        accountMailService.sendPasswordReset(
                credential.getEmail(), credential.getMember().getDisplayName(), token.rawToken());
        return actionResponse(RESET_SENT_MESSAGE, token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        validatePasswordBytes(request.password());
        AccountActionToken token = actionTokenService.consume(request.token(), AccountActionPurpose.RESET_PASSWORD);
        MemberCredential credential = token.getCredential();
        credential.updatePassword(passwordHasher.hash(request.password()));
        authSessionService.revokeAll(credential.getMember().getId());
    }

    @Transactional
    public void deleteAccount(MemberPrincipal principal, DeleteAccountRequest request) {
        MemberCredential credential = getCredential(principal.memberId());
        if (!passwordHasher.matches(request.password(), credential.getPasswordHash())) {
            throw new AuthenticationFailedException();
        }
        Long memberId = credential.getMember().getId();
        memberFollowRepository.deleteAllByFollowerIdOrFollowingId(memberId, memberId);
        travelLikeRepository.deleteAllByMemberId(memberId);
        travelCommentRepository.deleteAllByMemberId(memberId);
        travelLikeRepository.deleteAllByTravelMemberId(memberId);
        travelCommentRepository.deleteAllByTravelMemberId(memberId);
        travelPhotoRepository.deleteAllForMember(memberId);
        List<Travel> travels = travelRepository.findOwnedTravels(memberId);
        travelRepository.deleteAll(travels);
        travelRepository.flush();
        actionTokenRepository.deleteAllForCredential(credential.getId());
        authSessionService.deleteAll(memberId);
        credentialRepository.delete(credential);
        memberRepository.delete(credential.getMember());
    }

    private AccountActionTokenService.IssuedToken sendVerification(MemberCredential credential) {
        AccountActionTokenService.IssuedToken token = actionTokenService.issue(
                credential, AccountActionPurpose.VERIFY_EMAIL, VERIFICATION_LIFETIME);
        accountMailService.sendVerification(
                credential.getEmail(), credential.getMember().getDisplayName(), token.rawToken());
        return token;
    }

    private AccountActionResponse actionResponse(String message, AccountActionTokenService.IssuedToken token) {
        return new AccountActionResponse(message, exposeActionTokens ? token.rawToken() : null, token.expiresAt());
    }

    private AuthSessionResponse issue(MemberCredential credential) {
        AuthSessionService.IssuedSession issued = authSessionService.issue(credential.getMember());
        return new AuthSessionResponse(issued.token(), issued.expiresAt(), AuthMemberResponse.from(credential));
    }

    private MemberCredential getCredential(Long memberId) {
        return credentialRepository.findByMemberIdWithMember(memberId)
                .orElseThrow(() -> ResourceNotFoundException.profile(String.valueOf(memberId)));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new InvalidRequestException("비밀번호는 UTF-8 기준 72바이트 이내로 입력해 주세요.");
        }
    }

    private static String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
