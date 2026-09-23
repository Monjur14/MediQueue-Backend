import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./modules/auth/auth.routes.js";
import tenantsRouter from './modules/tenants/tenants.routes.js';
import patientsRouter from './modules/patients/patients.routes.js';
import doctorsRouter from './modules/doctors/doctors.routes.js';
import departmentsRouter from './modules/departments/departments.routes.js';
import clinicsRouter from './modules/clinics/clinics.routes.js';
import queueRouter from './modules/queue/queue.routes.js';
import { resolveTenant } from './middleware/resolveTenant.js';

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(resolveTenant);

app.get("/", (req, res) => {
  res.json({ message: "MediQueue API" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/clinics', clinicsRouter);
app.use('/api/queue', queueRouter);

// This should palaced last
app.use('/api', departmentsRouter); // For handle Public routes

export default app;
