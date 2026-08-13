-- Verification and password-reset tokens are opaque. Only their SHA-256 hashes are kept.
-- Existing credentials predate verification, so they are trusted during this migration;
-- newly registered accounts start unverified in the application.

alter table member_credentials
    add column email_verified_at timestamp with time zone;

update member_credentials
set email_verified_at = created_at
where email_verified_at is null;

create table account_action_tokens
(
    id                   uuid primary key,
    member_credential_id bigint       not null,
    purpose              varchar(30)  not null,
    token_hash           varchar(64)  not null,
    expires_at           timestamp with time zone not null,
    consumed_at          timestamp with time zone,
    created_at           timestamp with time zone not null,
    constraint fk_account_tokens_credential foreign key (member_credential_id)
        references member_credentials (id) on delete cascade,
    constraint uk_account_tokens_hash unique (token_hash)
);

create index idx_account_tokens_active
    on account_action_tokens (member_credential_id, purpose, consumed_at, expires_at);

-- A member owns every travel record, so closing an account removes the archive atomically.
alter table travels drop constraint fk_travels_member;
alter table travels add constraint fk_travels_member
    foreign key (member_id) references members (id) on delete cascade;
