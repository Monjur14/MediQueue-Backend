export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    ADD CONSTRAINT check_patient_status
      CHECK (
        (role = 'patient' AND status = 'active')
        OR
        (role <> 'patient')
      );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    DROP CONSTRAINT check_patient_status;
  `);
};