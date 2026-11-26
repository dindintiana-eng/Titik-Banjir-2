USE db_geospasial_banjir;

-- Admin-entered incidents remain publicly usable without inventing a report row.
ALTER TABLE kejadian_banjir
  ADD COLUMN dikelola_admin TINYINT NOT NULL DEFAULT 0;
