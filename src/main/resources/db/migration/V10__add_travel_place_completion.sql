alter table travel_places add column completed_at timestamp with time zone;

create index idx_travel_places_completion
    on travel_places (travel_id, visited_at, completed_at);
