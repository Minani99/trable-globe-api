create table travel_tasks
(
    id         bigserial primary key,
    travel_id  bigint       not null,
    title      varchar(120) not null,
    category   varchar(20)  not null,
    completed  boolean      not null default false,
    sort_order integer      not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_travel_tasks_travel foreign key (travel_id) references travels (id) on delete cascade
);

create index idx_travel_tasks_travel_order on travel_tasks (travel_id, sort_order, id);
