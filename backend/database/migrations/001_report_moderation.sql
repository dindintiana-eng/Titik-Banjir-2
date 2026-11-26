USE db_geospasial_banjir;

-- Existing imported reports are retained as verified; new reports default to pending.
ALTER TABLE laporan
  ADD COLUMN status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'verified';

ALTER TABLE laporan
  MODIFY COLUMN status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending';

CREATE INDEX idx_laporan_status_kejadian ON laporan (status, id_kejadian);
