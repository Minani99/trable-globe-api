package com.travelglobe.trableglobeapi.social.dto;

import com.travelglobe.trableglobeapi.member.domain.Member;
import java.util.List;

public record MemberDiscoveryResponse(
        String username,
        String displayName,
        String bio,
        String profileImageUrl,
        long countryCount,
        long cityCount,
        long travelCount,
        long followerCount,
        boolean following,
        long sharedCountryCount,
        String recommendationReason,
        List<String> recentDestinations,
        List<DiscoveryCountryResponse> worldCountries) {

    public static MemberDiscoveryResponse of(
            Member member,
            long countryCount,
            long cityCount,
            long travelCount,
            long followerCount,
            boolean following,
            long sharedCountryCount,
            String recommendationReason,
            List<String> recentDestinations,
            List<DiscoveryCountryResponse> worldCountries) {
        return new MemberDiscoveryResponse(
                member.getUsername(), member.getDisplayName(), member.getBio(), member.getProfileImageUrl(),
                countryCount, cityCount, travelCount, followerCount, following, sharedCountryCount,
                recommendationReason, List.copyOf(recentDestinations), List.copyOf(worldCountries));
    }
}
