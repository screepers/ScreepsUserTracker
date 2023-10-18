CREATE TABLE tickData (
  tick INT NOT NULL,
  username TEXT NOT NULL,
  data json NOT NULL,
  CONSTRAINT id PRIMARY KEY (tick, username)
);

CREATE TABLE admin_utils_data (
  tick INT PRIMARY KEY,
  data json NOT NULL
);
  -- CONSTRAINT id PRIMARY KEY (tick)