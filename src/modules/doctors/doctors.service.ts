import { doctorsRepository }              from './doctors.repository.js';
import type { UpdateDoctorProfileInput }  from './doctors.schema.js';

export const doctorsService = {

  async updateProfile(userId: string, input: UpdateDoctorProfileInput) {
    if (Object.keys(input).length === 0) {
      throw new Error('NO_FIELDS_TO_UPDATE');
    }

    const doctor = await doctorsRepository.updateProfile(userId, input);
    if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

    return doctor;
  },
};