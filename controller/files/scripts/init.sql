CREATE TABLE tickData (
	id serial PRIMARY KEY,
  tick int NOT NULL,
  data json NOT NULL,
);