-- Accounts are separate from public profiles so credentials can evolve without leaking
-- into profile read models. Browser/mobile sessions are opaque: only a SHA-256 token hash
-- is persisted and the raw token is returned once at login.

create table member_credentials
(
    id            bigserial primary key,
    member_id     bigint       not null,
    email         varchar(254) not null,
    password_hash varchar(100) not null,
    created_at    timestamp with time zone not null,
    updated_at    timestamp with time zone not null,
    constraint fk_member_credentials_member foreign key (member_id) references members (id) on delete cascade,
    constraint uk_member_credentials_member unique (member_id),
    constraint uk_member_credentials_email unique (email)
);

comment on column member_credentials.password_hash is 'Adaptive password hash; never expose through an API response.';

create table auth_sessions
(
    id           uuid primary key,
    member_id    bigint      not null,
    token_hash   varchar(64) not null,
    expires_at   timestamp with time zone not null,
    created_at   timestamp with time zone not null,
    last_used_at timestamp with time zone not null,
    revoked_at   timestamp with time zone,
    constraint fk_auth_sessions_member foreign key (member_id) references members (id) on delete cascade,
    constraint uk_auth_sessions_token_hash unique (token_hash)
);

create index idx_auth_sessions_member on auth_sessions (member_id);
create index idx_auth_sessions_expiry on auth_sessions (revoked_at, expires_at);
