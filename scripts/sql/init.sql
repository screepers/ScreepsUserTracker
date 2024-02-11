CREATE TABLE tick_data (
    id serial PRIMARY KEY,
    data json NOT NULL,
    tick integer NOT NULL,
    username text NOT NULL
);