create table travel_likes
(
    id         bigserial primary key,
    travel_id  bigint not null,
    member_id  bigint not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_travel_likes_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint fk_travel_likes_member foreign key (member_id) references members (id) on delete cascade,
    constraint uk_travel_likes_travel_member unique (travel_id, member_id)
);

create index idx_travel_likes_travel on travel_likes (travel_id);
create index idx_travel_likes_member on travel_likes (member_id);

create table travel_comments
(
    id         bigserial primary key,
    travel_id  bigint       not null,
    member_id  bigint       not null,
    content    varchar(500) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_travel_comments_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint fk_travel_comments_member foreign key (member_id) references members (id) on delete cascade
);

create index idx_travel_comments_travel_created on travel_comments (travel_id, created_at desc);
create index idx_travel_comments_member on travel_comments (member_id);
