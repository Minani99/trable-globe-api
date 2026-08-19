package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.social.domain.MemberReport;
import com.travelglobe.trableglobeapi.social.domain.MemberReportStatus;

public record MemberReportResponse(Long reportId, MemberReportStatus status) {

    public static MemberReportResponse from(MemberReport report) {
        return new MemberReportResponse(report.getId(), report.getStatus());
    }
}
