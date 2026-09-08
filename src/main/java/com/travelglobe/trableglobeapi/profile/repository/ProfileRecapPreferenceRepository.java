package com.travelglobe.trableglobeapi.profile.repository;

import com.travelglobe.trableglobeapi.profile.domain.ProfileRecapPreference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRecapPreferenceRepository extends JpaRepository<ProfileRecapPreference, Long> {

    List<ProfileRecapPreference> findByMemberIdOrderByRecapYearDesc(Long memberId);

    Optional<ProfileRecapPreference> findByMemberIdAndRecapYear(Long memberId, int recapYear);

    void deleteAllByMemberId(Long memberId);
}
