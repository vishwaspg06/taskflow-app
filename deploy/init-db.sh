#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password APP_DB_PASSWORD
SELECT format('CREATE ROLE taskflow_user LOGIN PASSWORD %L', :'app_password') \gexec
CREATE TABLE tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT CONNECT ON DATABASE taskflow TO taskflow_user;
GRANT USAGE ON SCHEMA public TO taskflow_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO taskflow_user;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO taskflow_user;
SQL
