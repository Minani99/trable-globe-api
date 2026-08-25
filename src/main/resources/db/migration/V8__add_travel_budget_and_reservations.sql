create table travel_budgets
(
    id            bigserial primary key,
    travel_id     bigint         not null unique,
    target_amount numeric(14, 2) not null default 0,
    currency      varchar(3)     not null default 'KRW',
    created_at    timestamp with time zone not null,
    updated_at    timestamp with time zone not null,
    constraint fk_travel_budgets_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint ck_travel_budgets_amount check (target_amount >= 0)
);

create table travel_expenses
(
    id         bigserial primary key,
    travel_id  bigint         not null,
    title      varchar(120)   not null,
    category   varchar(20)    not null,
    amount     numeric(14, 2) not null,
    paid       boolean        not null default false,
    sort_order integer        not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_travel_expenses_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint ck_travel_expenses_amount check (amount >= 0)
);

create table travel_reservations
(
    id               bigserial primary key,
    travel_id        bigint       not null,
    title            varchar(120) not null,
    category         varchar(20)  not null,
    reservation_date date         not null,
    memo             varchar(500),
    confirmed        boolean      not null default false,
    sort_order       integer      not null,
    created_at       timestamp with time zone not null,
    updated_at       timestamp with time zone not null,
    constraint fk_travel_reservations_travel foreign key (travel_id) references travels (id) on delete cascade
);

create index idx_travel_expenses_travel_order on travel_expenses (travel_id, sort_order, id);
create index idx_travel_reservations_travel_date on travel_reservations (travel_id, reservation_date, sort_order, id);
