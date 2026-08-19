create table member_follows
(
    id           bigserial primary key,
    follower_id  bigint not null,
    following_id bigint not null,
    created_at   timestamp with time zone not null,
    updated_at   timestamp with time zone not null,
    constraint fk_member_follows_follower foreign key (follower_id) references members (id) on delete cascade,
    constraint fk_member_follows_following foreign key (following_id) references members (id) on delete cascade,
    constraint uk_member_follows_pair unique (follower_id, following_id),
    constraint ck_member_follows_not_self check (follower_id <> following_id)
);

create index idx_member_follows_follower on member_follows (follower_id, created_at desc);
create index idx_member_follows_following on member_follows (following_id, created_at desc);
