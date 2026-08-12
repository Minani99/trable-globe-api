package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.domain.MemberCredential;
import com.travelglobe.trableglobeapi.auth.dto.AuthMemberResponse;
import com.travelglobe.trableglobeapi.auth.dto.AuthSessionResponse;
import com.travelglobe.trableglobeapi.auth.dto.LoginRequest;
import com.travelglobe.trableglobeapi.auth.dto.RegisterRequest;
import com.travelglobe.trableglobeapi.auth.dto.UpdateProfileRequest;
import com.travelglobe.trableglobeapi.auth.repository.MemberCredentialRepository;
import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.auth.security.PasswordHasher;
import com.travelglobe.trableglobeapi.global.exception.AuthenticationFailedException;
import com.travelglobe.trableglobeapi.global.exception.ConflictException;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final MemberRepository memberRepository;
    private final MemberCredentialRepository credentialRepository;
    private final AuthSessionService authSessionService;
    private final PasswordHasher passwordHasher;
    private final String dummyPasswordHash;

    public AuthService(MemberRepository memberRepository,
                       MemberCredentialRepository credentialRepository,
                       AuthSessionService authSessionService,
                       PasswordHasher passwordHasher) {
        this.memberRepository = memberRepository;
        this.credentialRepository = credentialRepository;
        this.authSessionService = authSessionService;
        this.passwordHasher = passwordHasher;
        this.dummyPasswordHash = passwordHasher.hash("timing-only-password");
    }

    @Transactional
    public AuthSessionResponse register(RegisterRequest request) {
        String username = Member.normalizeUsername(request.username());
        String email = normalizeEmail(request.email());
        validatePasswordBytes(request.password());

        if (memberRepository.existsByUsername(username)) {
            throw new ConflictException("이미 사용 중인 사용자명입니다.");
        }
        if (credentialRepository.existsByEmail(email)) {
            throw new ConflictException("이미 가입된 이메일입니다.");
        }

        Member member = memberRepository.save(Member.create(
                username, request.displayName().trim(), null, null));
        MemberCredential credential = credentialRepository.save(MemberCredential.create(
                member, email, passwordHasher.hash(request.password())));
        return issue(credential);
    }

    @Transactional
    public AuthSessionResponse login(LoginRequest request) {
        Optional<MemberCredential> found = credentialRepository
                .findByEmailWithMember(normalizeEmail(request.email()));
        boolean matches = passwordHasher.matches(
                request.password(), found.map(MemberCredential::getPasswordHash).orElse(dummyPasswordHash));
        if (found.isEmpty() || !matches) {
            throw new AuthenticationFailedException();
        }
        MemberCredential credential = found.orElseThrow();
        return issue(credential);
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

    private AuthSessionResponse issue(MemberCredential credential) {
        AuthSessionService.IssuedSession issued = authSessionService.issue(credential.getMember());
        return new AuthSessionResponse(
                issued.token(), issued.expiresAt(), AuthMemberResponse.from(credential));
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
