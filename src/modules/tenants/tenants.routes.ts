import { Router } from "express";
import { tenantsController } from "./tenants.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

// only tenant_admin can invite doctors
router.post(
  "/doctors/invite",
  authenticate,
  requireRole("tenant_admin"),
  tenantsController.inviteDoctor,
);
router.get(
  "/me",
  authenticate,
  requireRole("tenant_admin"),
  tenantsController.getMe,
);
router.put(
  "/me",
  authenticate,
  requireRole("tenant_admin"),
  tenantsController.updateMe,
);
router.get(
  "/doctors",
  authenticate,
  requireRole("tenant_admin"),
  tenantsController.getDoctors,
);
router.delete(
  "/doctors/:id",
  authenticate,
  requireRole("tenant_admin"),
  tenantsController.removeDoctor,
);
router.put(
  '/doctors/:id',
  authenticate,
  requireRole('tenant_admin'),
  tenantsController.updateDoctor
);

export default router;
