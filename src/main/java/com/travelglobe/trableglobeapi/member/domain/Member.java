package com.travelglobe.trableglobeapi.member.domain;

import com.travelglobe.trableglobeapi.global.domain.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A person who owns a travel globe.
 *
 * <p>{@code username} is the public handle used in the profile URL ({@code /@traveler}),
 * which is why it is unique and immutable after creation. Authentication credentials are
 * intentionally absent: sign-up arrives in a later phase and will be modelled as a
 * separate credential entity so that this one stays a profile.
 */
@Entity
@Table(
        name = "members",
        uniqueConstraints = @UniqueConstraint(name = "uk_members_username", columnNames = "username"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseTimeEntity {

    public static final int USERNAME_MAX_LENGTH = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, length = USERNAME_MAX_LENGTH, updatable = false)
    private String username;

    @Column(name = "display_name", nullable = false, length = 60)
    private String displayName;

    @Column(name = "bio", length = 300)
    private String bio;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    private Member(String username, String displayName, String bio, String profileImageUrl) {
        this.username = username;
        this.displayName = displayName;
        this.bio = bio;
        this.profileImageUrl = profileImageUrl;
    }

    /**
     * Creates a profile.
     *
     * <p>The handle is stored lower cased so that {@code /@Traveler} and {@code /@traveler}
     * resolve to one profile while lookups stay a plain indexed equality match.
     */
    public static Member create(String username, String displayName, String bio, String profileImageUrl) {
        return new Member(normalizeUsername(username), displayName, bio, profileImageUrl);
    }

    /** Applies the same normalisation to an incoming handle before a lookup. */
    public static String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase(java.util.Locale.ROOT);
    }

    public void updateProfile(String displayName, String bio, String profileImageUrl) {
        this.displayName = displayName;
        this.bio = bio;
        this.profileImageUrl = profileImageUrl;
    }
}
