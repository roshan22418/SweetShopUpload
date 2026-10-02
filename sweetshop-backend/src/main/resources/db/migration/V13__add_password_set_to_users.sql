-- Accounts created through "Sign in with Google" have no password the user knows (they get a random
-- unusable hash so password_hash can stay NOT NULL). This flag tells the app which accounts can
-- actually log in / change their password with one.
ALTER TABLE users ADD COLUMN password_set BOOLEAN NOT NULL DEFAULT TRUE;
