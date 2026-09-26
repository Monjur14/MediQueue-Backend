import type { Request, Response } from "express";
import { inviteDoctorSchema, updateTenantSchema, updateDoctorSchema } from "./tenants.schema.js";
import { tenantsService } from "./tenants.service.js";

export const tenantsController = {
  async inviteDoctor(req: Request, res: Response) {
    const parsed = inviteDoctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tenantId = req.user!.tenantId!;
      const doctor = await tenantsService.inviteDoctor(parsed.data, tenantId);
      return res.status(201).json({
        message: "Doctor invited successfully. Setup email sent.",
        doctor,
      });
    } catch (err: any) {
      console.error("INVITE DOCTOR ERROR:", err);
      if (err.message === "EMAIL_TAKEN") {
        return res.status(409).json({ message: "Email already in use" });
      }
      if (err.message === "TENANT_NOT_FOUND") {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (err.message === "DOCTOR_LIMIT_REACHED") {
        return res.status(403).json({
          message: "Doctor limit reached for your plan. Please upgrade.",
        });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  async updateMe(req: Request, res: Response) {
    const parsed = updateTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tenantId = req.user!.tenantId!;
      const tenant = await tenantsService.updateTenant(tenantId, parsed.data);
      return res.status(200).json({ tenant });
    } catch (err: any) {
      if (err.message === "NO_FIELDS_TO_UPDATE") {
        return res.status(400).json({ message: "No fields to update" });
      }
      if (err.message === "TENANT_NOT_FOUND") {
        return res.status(404).json({ message: "Tenant not found" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  async getDoctors(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const doctors = await tenantsService.getDoctors(tenantId);
      return res.status(200).json({ doctors });
    } catch (err: any) {
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  async removeDoctor(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const doctorId = req.params["id"] as string;

      await tenantsService.removeDoctor(doctorId, tenantId);
      return res.status(200).json({ message: "Doctor removed successfully" });
    } catch (err: any) {
      if (err.message === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({ message: "Doctor not found" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  async updateDoctor(req: Request, res: Response) {
    const parsed = updateDoctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tenantId = req.user!.tenantId!;

      // Explicit type assertion applied here
      const doctorId = req.params['id'] as string;

      const doctor = await tenantsService.updateDoctor(doctorId, tenantId, parsed.data);
      return res.status(200).json({ doctor });
    } catch (err: any) {
      if (err.message === 'NO_FIELDS_TO_UPDATE') {
        return res.status(400).json({ message: 'No fields to update' });
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getMe(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const tenant = await tenantsService.getMe(tenantId);
      return res.status(200).json({ tenant });
    } catch (err: any) {
      if (err.message === "TENANT_NOT_FOUND") {
        return res.status(404).json({ message: "Tenant not found" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
