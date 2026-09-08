create table profile_recap_preferences
(
    id                  bigserial primary key,
    member_id           bigint       not null,
    recap_year          integer      not null,
    narrative           varchar(240),
    featured_travel_ids varchar(160),
    created_at          timestamp with time zone not null,
    updated_at          timestamp with time zone not null,
    constraint fk_profile_recap_preferences_member
        foreign key (member_id) references members (id) on delete cascade,
    constraint uk_profile_recap_preferences_member_year unique (member_id, recap_year),
    constraint ck_profile_recap_preferences_year check (recap_year between 1900 and 2100)
);

create index idx_profile_recap_preferences_member
    on profile_recap_preferences (member_id, recap_year desc);
