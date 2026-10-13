ALTER TABLE travels ADD COLUMN share_token VARCHAR(64);
CREATE UNIQUE INDEX ux_travels_share_token ON travels (share_token);
