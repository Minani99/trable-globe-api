alter table travel_places add column start_time time;
alter table travel_places add column duration_minutes integer;

alter table travel_places
    add constraint ck_travel_places_duration_minutes
        check (duration_minutes is null or (duration_minutes >= 15 and duration_minutes <= 1440));

create index idx_travel_places_schedule
    on travel_places (travel_id, visited_at, start_time, sort_order);
