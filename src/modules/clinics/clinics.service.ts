import { clinicsRepository } from './clinics.repository.js';

export const clinicsService = {

  async searchClinics(search: string) {
    if (!search || search.trim().length < 2) {
      throw new Error('SEARCH_TOO_SHORT');
    }
    return clinicsRepository.searchClinics(search.trim());
  },
};