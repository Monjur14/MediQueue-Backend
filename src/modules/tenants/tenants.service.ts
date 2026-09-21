import crypto from "crypto";
import { tenantsRepository } from "./tenants.repository.js";
import { emailUtil } from "../../utils/email.js";
import type { InviteDoctorInput, UpdateTenantInput, UpdateDoctorInput } from "./tenants.schema.js";

export const tenantsService = {
  async inviteDoctor(input: InviteDoctorInput, tenantId: string) {
    // 1. check email not already taken
    const existing = await tenantsRepository.findUserByEmail(input.email);
    if (existing) throw new Error("EMAIL_TAKEN");

    // 2. get tenant info
    const tenant = await tenantsRepository.findTenantById(tenantId);
    if (!tenant) throw new Error("TENANT_NOT_FOUND");

    // 3. check plan doctor limit
    const plan = await tenantsRepository.getPlanByTenantId(tenantId);
    if (plan && plan.max_doctors !== null) {
      const doctorCount =
        await tenantsRepository.countDoctorsInTenant(tenantId);
      if (doctorCount >= plan.max_doctors) {
        throw new Error("DOCTOR_LIMIT_REACHED");
      }
    }

    // 4. generate setup token
    const setup_token = crypto.randomBytes(32).toString("hex");
    const setup_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 5. create doctor account
    const doctor = await tenantsRepository.createDoctor({
      full_name: input.full_name,
      email: input.email,
      ...(input.phone !== undefined && { phone: input.phone }),
      tenant_id: tenantId,
      setup_token,
      setup_token_expires_at,
    });

    // 6. send invitation email
    await emailUtil.sendDoctorInvitation({
      to: input.email,
      full_name: input.full_name,
      setupToken: setup_token,
      clinicName: tenant.name,
    });

    return doctor;
  },
  async updateTenant(tenantId: string, input: UpdateTenantInput) {
    if (Object.keys(input).length === 0) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    // Remove undefined properties to satisfy exactOptionalPropertyTypes
    const cleanedInput = Object.fromEntries(
      Object.entries(input).filter(([_, value]) => value !== undefined),
    );

    const tenant = await tenantsRepository.updateTenant(tenantId, cleanedInput);
    if (!tenant) throw new Error("TENANT_NOT_FOUND");

    return tenant;
  },
  async getDoctors(tenantId: string) {
    const doctors = await tenantsRepository.getDoctors(tenantId);
    return doctors;
  },
  async removeDoctor(doctorId: string, tenantId: string) {
    // make sure doctor belongs to this tenant
    const doctor = await tenantsRepository.findDoctorInTenant(
      doctorId,
      tenantId,
    );
    if (!doctor) throw new Error("DOCTOR_NOT_FOUND");

    await tenantsRepository.softDeleteDoctor(doctorId);
  },
  async updateDoctor(doctorId: string, tenantId: string, input: UpdateDoctorInput) {
    if (Object.keys(input).length === 0) {
      throw new Error('NO_FIELDS_TO_UPDATE');
    }

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const cleanedInput = Object.fromEntries(
      Object.entries(input).filter(([_, value]) => value !== undefined)
    );

    const doctor = await tenantsRepository.updateDoctor(doctorId, tenantId, cleanedInput);
    if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

    return doctor;
  }
};
