package com.travelglobe.trableglobeapi.member.service;

import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.member.domain.Member;
import com.travelglobe.trableglobeapi.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    /**
     * Resolves a public handle to its member.
     *
     * @throws InvalidRequestException   when the handle is blank or too long to be valid
     * @throws ResourceNotFoundException when no profile owns the handle
     */
    public Member getByUsername(String username) {
        String normalized = Member.normalizeUsername(username);
        if (!StringUtils.hasText(normalized)) {
            throw new InvalidRequestException("사용자명이 비어 있습니다.");
        }
        if (normalized.length() > Member.USERNAME_MAX_LENGTH) {
            throw new InvalidRequestException("사용자명이 너무 깁니다.");
        }
        return memberRepository.findByUsername(normalized)
                .orElseThrow(() -> ResourceNotFoundException.profile(username));
    }
}
