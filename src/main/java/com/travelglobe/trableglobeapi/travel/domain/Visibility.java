package com.travelglobe.trableglobeapi.travel.domain;

/**
 * Who may read a travel record.
 *
 * <p>Persisted by name ({@code EnumType.STRING}) so new values can be inserted without
 * renumbering. {@code FOLLOWERS} is intentionally absent until following exists - the
 * column is wide enough to take it.
 */
public enum Visibility {

    /** Visible to anyone who opens the owner's profile. */
    PUBLIC,

    /** Visible only to the owner. Excluded from every public read query. */
    PRIVATE
}
