create table member_blocks
(
    id         bigserial primary key,
    blocker_id bigint not null,
    blocked_id bigint not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_member_blocks_blocker foreign key (blocker_id) references members (id) on delete cascade,
    constraint fk_member_blocks_blocked foreign key (blocked_id) references members (id) on delete cascade,
    constraint uk_member_blocks_pair unique (blocker_id, blocked_id),
    constraint ck_member_blocks_not_self check (blocker_id <> blocked_id)
);

create index idx_member_blocks_blocker on member_blocks (blocker_id, created_at desc);
create index idx_member_blocks_blocked on member_blocks (blocked_id, created_at desc);

create table member_reports
(
    id                 bigserial primary key,
    reporter_id        bigint not null,
    reported_member_id bigint not null,
    reason             varchar(40) not null,
    details            varchar(500),
    status             varchar(20) not null,
    created_at         timestamp with time zone not null,
    updated_at         timestamp with time zone not null,
    constraint fk_member_reports_reporter foreign key (reporter_id) references members (id) on delete cascade,
    constraint fk_member_reports_reported_member foreign key (reported_member_id) references members (id) on delete cascade,
    constraint ck_member_reports_not_self check (reporter_id <> reported_member_id),
    constraint ck_member_reports_reason check (reason in ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'IMPERSONATION', 'INAPPROPRIATE_CONTENT', 'OTHER')),
    constraint ck_member_reports_status check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'))
);

create index idx_member_reports_queue on member_reports (status, created_at asc);
create index idx_member_reports_reporter_target on member_reports (reporter_id, reported_member_id, created_at desc);
