-- Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
-- Migration 003: Nutzer-Tabelle aus "public" in das Schema "identity" verschieben
--
-- Reihenfolge: 001 (tixify-catalog) → 002 (tixify-orders) → 003 (dieses Repo)
-- VORHER (Owner der Heroku-App):
--   heroku pg:backups:capture -a tixify
-- AUSFÜHREN:
--   heroku pg:psql -a tixify < db/migrations/003_move_users_to_identity.sql
--
-- Läuft komplett in einer Transaktion: Schlägt ein Schritt fehl, bleibt alles wie vorher.

BEGIN;

CREATE SCHEMA IF NOT EXISTS identity;

ALTER TABLE public.users SET SCHEMA identity;

ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 1. Rollen vereinheitlichen: Das Test-Skript insertDb.js legte Nutzer mit der Rolle 'user' an,
--    die Registrierung mit 'customer'. Gemeint ist dasselbe.
UPDATE identity.users SET role = 'customer' WHERE role IS NULL OR role NOT IN ('customer', 'organizer', 'admin');
ALTER TABLE identity.users ALTER COLUMN role SET DEFAULT 'customer';
ALTER TABLE identity.users ALTER COLUMN role SET NOT NULL;
ALTER TABLE identity.users ADD CONSTRAINT users_role_valid CHECK (role IN ('customer', 'organizer', 'admin'));

-- 2. E-Mails kleinschreiben. Das alte Backend speicherte sie so, wie sie eingegeben wurden,
--    suchte beim Login aber kleingeschrieben – wer sich mit Großbuchstaben registrierte,
--    konnte sich nie einloggen. Gibt es dieselbe Adresse zweimal (nur in anderer Schreibweise),
--    bricht die Migration hier ab: die Doppelten dann erst von Hand zusammenführen.
DO $$
DECLARE dup text;
BEGIN
  SELECT lower(email) INTO dup FROM identity.users GROUP BY lower(email) HAVING count(*) > 1 LIMIT 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'E-Mail % existiert mehrfach in unterschiedlicher Schreibweise. Bitte zuerst bereinigen.', dup;
  END IF;
END $$;

UPDATE identity.users SET email = lower(trim(email));
ALTER TABLE identity.users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON identity.users (email);

COMMIT;
