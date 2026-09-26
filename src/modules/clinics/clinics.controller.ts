import type { Request, Response } from 'express';
import { clinicsService } from './clinics.service.js';

export const clinicsController = {

  async search(req: Request, res: Response) {
    const search = req.query['search'] as string;
    if (!search) {
      return res.status(400).json({ message: 'search query is required' });
    }
    try {
      const clinics = await clinicsService.searchClinics(search);
      return res.status(200).json({ clinics });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'SEARCH_TOO_SHORT') {
        return res.status(400).json({ message: 'Search must be at least 2 characters' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async searchDoctors(req: Request, res: Response) {
    const search = req.query['search'] as string;
    if (!search) {
      return res.status(400).json({ message: 'search query is required' });
    }
    try {
      const doctors = await clinicsService.searchDoctors(search);
      return res.status(200).json({ doctors });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'SEARCH_TOO_SHORT') {
        return res.status(400).json({ message: 'Search must be at least 2 characters' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getQueue(req: Request, res: Response) {
    const { slug } = req.params as { slug: string };
    try {
      const sessions = await clinicsService.getClinicQueue(slug);
      return res.status(200).json({ sessions });
    } catch (err: unknown) {
      console.error('[CLINICS] getQueue error for slug=%s:', slug, err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
