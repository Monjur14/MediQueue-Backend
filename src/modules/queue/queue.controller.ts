import type { Request, Response } from 'express';
import {
    openSessionSchema,
    giveTokenSchema,
    markFeeSchema,
    doctorBreakSchema,
    updateNotesSchema,
} from './queue.schema.js';
import { queueService } from './queue.service.js';

export const queueController = {

    async openSession(req: Request, res: Response) {
        const parsed = openSessionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const tenantId = req.user!.tenantId!;
            const session = await queueService.openSession(tenantId, parsed.data);
            return res.status(201).json({ session });
        } catch (err: any) {
            console.error('OPEN SESSION ERROR:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async closeSession(req: Request, res: Response) {
        try {
            const sessionId = req.params['id'] as string;
            const session = await queueService.closeSession(sessionId);
            return res.status(200).json({ session });
        } catch (err: any) {
            if (err.message === 'SESSION_NOT_FOUND') {
                return res.status(404).json({ message: 'Session not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async giveToken(req: Request, res: Response) {
        const parsed = giveTokenSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const tenantId = req.user!.tenantId!;
            const result = await queueService.giveToken(tenantId, parsed.data);
            return res.status(201).json(result);
        } catch (err: any) {
            if (err.message === 'SESSION_NOT_FOUND') return res.status(404).json({ message: 'Session not found or closed' });
            if (err.message === 'QUEUE_FULL') return res.status(400).json({ message: 'Queue is full for today' });
            if (err.message === 'PATIENT_NOT_FOUND') return res.status(404).json({ message: 'Patient not found with this phone number' });
            if (err.message === 'ALREADY_HAS_TOKEN') return res.status(409).json({ message: 'Patient already has a token for this session' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async callNextToken(req: Request, res: Response) {
        try {
            const sessionId = req.params['id'] as string;
            const token = await queueService.callNextToken(sessionId);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'SESSION_NOT_FOUND') return res.status(404).json({ message: 'Session not found' });
            if (err.message === 'NO_WAITING_TOKENS') return res.status(400).json({ message: 'No waiting tokens' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async skipToken(req: Request, res: Response) {
        try {
            const tokenId = req.params['id'] as string;
            const sessionId = req.body.session_id;
            const token = await queueService.skipToken(tokenId, sessionId);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'TOKEN_NOT_FOUND') return res.status(404).json({ message: 'Token not found' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async completeToken(req: Request, res: Response) {
        try {
            const tokenId = req.params['id'] as string;
            const sessionId = req.body.session_id;
            const token = await queueService.completeToken(tokenId, sessionId);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'TOKEN_NOT_FOUND') return res.status(404).json({ message: 'Token not found' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async markFeePaid(req: Request, res: Response) {
        const parsed = markFeeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const tokenId = req.params['id'] as string;
            const token = await queueService.markFeePaid(tokenId, parsed.data);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'TOKEN_NOT_FOUND') return res.status(404).json({ message: 'Token not found' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async updateNotes(req: Request, res: Response) {
        const parsed = updateNotesSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const tokenId = req.params['id'] as string;
            const token = await queueService.updateNotes(tokenId, parsed.data);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'VERSION_CONFLICT') {
                return res.status(409).json({
                    message: 'Note was updated by someone else. Please refresh.',
                });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async startBreak(req: Request, res: Response) {
        const parsed = doctorBreakSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const sessionId = req.params['id'] as string;
            const doctorId = req.user!.id;
            const result = await queueService.startBreak(sessionId, doctorId, parsed.data);
            return res.status(201).json({ break: result });
        } catch (err: any) {
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async endBreak(req: Request, res: Response) {
        try {
            const sessionId = req.params['id'] as string;
            const breakId = req.params['breakId'] as string;
            const result = await queueService.endBreak(breakId, sessionId);
            return res.status(200).json({ break: result });
        } catch (err: any) {
            if (err.message === 'BREAK_NOT_FOUND') return res.status(404).json({ message: 'Break not found' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getSessionStatus(req: Request, res: Response) {
        try {
            const sessionId = req.params['id'] as string;
            const status = await queueService.getSessionStatus(sessionId);
            return res.status(200).json({ status });
        } catch (err: any) {
            if (err.message === 'SESSION_NOT_FOUND') return res.status(404).json({ message: 'Session not found' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getTodaySessions(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;
            const sessions = await queueService.getTodaySessions(tenantId);
            return res.status(200).json({ sessions });
        } catch {
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getMyToken(req: Request, res: Response) {
        try {
            const sessionId = req.params['id'] as string;
            const patientId = req.user!.id;
            const token = await queueService.getMyToken(sessionId, patientId);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'TOKEN_NOT_FOUND') return res.status(404).json({ message: 'No token found for this session' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
    async checkinToken(req: Request, res: Response) {
        try {
            const tokenId = req.params['id'] as string;
            const sessionId = req.body.session_id;
            const token = await queueService.checkinToken(tokenId, sessionId);
            return res.status(200).json({ token });
        } catch (err: any) {
            if (err.message === 'TOKEN_NOT_FOUND') {
                return res.status(404).json({ message: 'Token not found or not in called status' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
};