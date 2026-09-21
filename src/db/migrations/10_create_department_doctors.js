export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE department_doctors (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      department_id UUID NOT NULL,
      doctor_id     UUID NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_department_doctors_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id),

      CONSTRAINT fk_department_doctors_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES users(id),

      CONSTRAINT unique_doctor_department
        UNIQUE (department_id, doctor_id)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS department_doctors;`);
};