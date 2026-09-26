export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_sessions
      ALTER COLUMN department_id DROP NOT NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_sessions
      ALTER COLUMN department_id SET NOT NULL;
  `);
};
