package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.social.domain.MemberReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateMemberReportRequest(
        @NotNull(message = "신고 사유를 선택해 주세요.")
        MemberReportReason reason,

        @Size(max = 500, message = "신고 내용은 500자 이내로 입력해 주세요.")
        String details) {
}
