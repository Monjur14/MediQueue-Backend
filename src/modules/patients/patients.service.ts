import { patientsRepository }        from './patients.repository.js';
import type { UpdatePatientInput }   from './patients.schema.js';

export const patientsService = {

  async updateProfile(userId: string, input: UpdatePatientInput) {
    // nothing to update
    if (Object.keys(input).length === 0) {
      throw new Error('NO_FIELDS_TO_UPDATE');
    }

    const user = await patientsRepository.updatePatient(userId, input);
    if (!user) throw new Error('USER_NOT_FOUND');

    return user;
  },
};