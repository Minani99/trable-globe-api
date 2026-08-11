-- Travel Globe initial schema (PostgreSQL).
--
-- This file is the authoritative schema for the "postgres" and "prod" profiles: Hibernate
-- runs with ddl-auto=validate there and will refuse to start if the entity model drifts
-- from these tables. The "local" profile skips Flyway and generates an H2 schema from the
-- entities instead, so that a developer can boot the API without installing PostgreSQL.

create table members
(
    id                bigserial primary key,
    username          varchar(30)  not null,
    display_name      varchar(60)  not null,
    bio               varchar(300),
    profile_image_url varchar(500),
    created_at        timestamp with time zone not null,
    updated_at        timestamp with time zone not null,
    constraint uk_members_username unique (username)
);

comment on column members.username is 'Public handle used in the profile URL. Stored lower cased.';

create table countries
(
    id        bigserial primary key,
    iso2_code varchar(2)    not null,
    iso3_code varchar(3)    not null,
    name_en   varchar(100)  not null,
    name_ko   varchar(100)  not null,
    latitude  numeric(9, 6) not null,
    longitude numeric(9, 6) not null,
    constraint uk_countries_iso2 unique (iso2_code),
    constraint uk_countries_iso3 unique (iso3_code)
);

comment on column countries.latitude is 'Label centroid used to place the globe marker, not the geometric centroid.';

create table cities
(
    id         bigserial primary key,
    country_id bigint        not null,
    name_en    varchar(100)  not null,
    name_ko    varchar(100)  not null,
    latitude   numeric(9, 6) not null,
    longitude  numeric(9, 6) not null,
    constraint fk_cities_country foreign key (country_id) references countries (id),
    constraint uk_cities_country_name_en unique (country_id, name_en)
);

create table travels
(
    id              bigserial primary key,
    member_id       bigint       not null,
    title           varchar(120) not null,
    description     varchar(2000),
    start_date      date         not null,
    end_date        date         not null,
    cover_image_url varchar(500),
    visibility      varchar(20)  not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_travels_member foreign key (member_id) references members (id),
    constraint ck_travels_date_range check (end_date >= start_date)
);

-- Profile pages always read a member's trips newest first.
create index idx_travels_member_start_date on travels (member_id, start_date desc);
create index idx_travels_visibility on travels (visibility);

create table travel_places
(
    id         bigserial primary key,
    travel_id  bigint       not null,
    country_id bigint       not null,
    city_id    bigint,
    place_name varchar(150) not null,
    latitude   numeric(9, 6),
    longitude  numeric(9, 6),
    visited_at date,
    memo       varchar(1000),
    sort_order integer      not null,
    constraint fk_travel_places_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint fk_travel_places_country foreign key (country_id) references countries (id),
    constraint fk_travel_places_city foreign key (city_id) references cities (id)
);

comment on table travel_places is 'A stop within a trip. The single source of truth for "visited" countries and cities.';
comment on column travel_places.latitude is 'Optional exact coordinate; falls back to the city, then the country centroid.';

create index idx_travel_places_travel on travel_places (travel_id, sort_order);
-- Country aggregation (visited countries, per-country trip counts) groups on this column.
create index idx_travel_places_country on travel_places (country_id);
create index idx_travel_places_city on travel_places (city_id);

create table travel_photos
(
    id              bigserial primary key,
    travel_id       bigint       not null,
    travel_place_id bigint,
    image_url       varchar(500) not null,
    caption         varchar(300),
    taken_at        date,
    sort_order      integer      not null,
    constraint fk_travel_photos_travel foreign key (travel_id) references travels (id) on delete cascade,
    constraint fk_travel_photos_place foreign key (travel_place_id) references travel_places (id) on delete set null
);

create index idx_travel_photos_travel on travel_photos (travel_id, sort_order);
