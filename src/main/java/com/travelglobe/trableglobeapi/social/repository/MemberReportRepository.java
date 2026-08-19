package com.travelglobe.trableglobeapi.social.repository;

import com.travelglobe.trableglobeapi.social.domain.MemberReport;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberReportRepository extends JpaRepository<MemberReport, Long> {

    boolean existsByReporterIdAndReportedMemberIdAndCreatedAtAfter(
            Long reporterId, Long reportedMemberId, Instant createdAfter);

    @Modifying
    @Query("delete from MemberReport report where report.reporter.id = :memberId or report.reportedMember.id = :memberId")
    void deleteAllForMember(@Param("memberId") Long memberId);
}
