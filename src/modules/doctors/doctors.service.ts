import { passwordUtil }                   from '../../utils/password.js';
import { doctorsRepository }              from './doctors.repository.js';
import type { UpdateDoctorProfileInput, CreateDoctorInput } from './doctors.schema.js';

export const doctorsService = {

  async listByTenant(tenantId: string) {
    return doctorsRepository.findAllByTenant(tenantId);
  },

  async createDoctor(tenantId: string, input: CreateDoctorInput) {
    // Temporary password — doctor should reset via email
    const tempPassword = Math.random().toString(36).slice(-10);
    const password_hash = await passwordUtil.hash(tempPassword);

    return doctorsRepository.create({
      tenantId,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      password_hash,
    });
  },

  async updateProfile(userId: string, input: UpdateDoctorProfileInput) {
    if (Object.keys(input).length === 0) {
      throw new Error('NO_FIELDS_TO_UPDATE');
    }

    const doctor = await doctorsRepository.updateProfile(userId, input);
    if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

    return doctor;
  },
};
