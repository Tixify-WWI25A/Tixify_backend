-- Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
-- Tixify identity-Service (im Repo tixify-gateway): vollständiges Schema
-- Baut den Datenbereich von Grund auf (lokal / CI).
-- Für die bestehende Heroku-Datenbank stattdessen db/migrations/003_move_users_to_identity.sql ausführen.
--
-- Regel: Nur identity liest und schreibt in diesem Schema. Andere Services kennen Nutzer nur über
-- die user_id im Login-Token – nie über einen Fremdschlüssel.

CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.users (
  user_id       SERIAL       PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_role_valid CHECK (role IN ('customer', 'organizer', 'admin')),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

-- Eine E-Mail-Adresse = ein Konto (auch bei gleichzeitigen Registrierungen)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON identity.users (email);
