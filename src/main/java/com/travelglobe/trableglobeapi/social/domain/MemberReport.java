package com.travelglobe.trableglobeapi.social.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import com.travelglobe.trableglobeapi.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_member_reports_reporter"))
    private Member reporter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_member_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_member_reports_reported_member"))
    private Member reportedMember;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 40)
    private MemberReportReason reason;

    @Column(name = "details", length = 500)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MemberReportStatus status;

    private MemberReport(Member reporter, Member reportedMember,
                         MemberReportReason reason, String details) {
        this.reporter = reporter;
        this.reportedMember = reportedMember;
        this.reason = reason;
        this.details = details;
        this.status = MemberReportStatus.OPEN;
    }

    public static MemberReport create(Member reporter, Member reportedMember,
                                      MemberReportReason reason, String details) {
        return new MemberReport(reporter, reportedMember, reason, details);
    }
}
