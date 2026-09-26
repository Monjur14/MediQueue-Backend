import type { Request, Response } from "express";
import {
  registerSchema,
  registerTenantSchema,
  loginSchema,
  refreshSchema,
} from "./auth.schema.js";
import { authService } from "./auth.service.js";

export const authController = {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const user = await authService.register(parsed.data);
      return res.status(201).json({ user });
    } catch (err: any) {
      if (err.message === "EMAIL_TAKEN") {
        return res.status(409).json({ message: "Email already in use" });
      }
      if (err.message === "PHONE_TAKEN") {
        return res.status(409).json({ message: "Phone number already registered" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  async registerTenant(req: Request, res: Response) {
    const parsed = registerTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const { tenant, user } = await authService.registerTenant(parsed.data);
      return res.status(201).json({
        message:
          "Registration successful. Please complete payment to activate.",
        tenant,
        user,
      });
    } catch (err: any) {
      console.error("REGISTER TENANT ERROR:", err); // ← add this
      if (err.message === "EMAIL_TAKEN")
        return res.status(409).json({ message: "Email already in use" });
      if (err.message === "PHONE_TAKEN")
        return res.status(409).json({ message: "Phone number already registered" });
      if (err.message === "CLINIC_NAME_TAKEN")
        return res.status(409).json({ message: "Clinic name already taken. Try a different name." });
      if (err.message === "PLAN_NOT_FOUND")
        return res.status(404).json({ message: "Plan not found" });
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getMe(req: Request, res: Response) {
  try {
    const user = await authService.getMe(req.user!.id);
    return res.status(200).json({ user });
  } catch (err: any) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
},

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const result = await authService.login(parsed.data);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); // ← add this
      if (err.message === "PAYMENT_REQUIRED") {
        return res.status(403).json({
          message: "Please complete payment to activate your account",
        });
      }
      if (err.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (err.message === "ACCOUNT_DISABLED") {
        return res.status(403).json({ message: "Account is disabled" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async setupPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    try {
      await authService.setupPassword(token, password);
      return res
        .status(200)
        .json({ message: "Password set successfully. You can now login." });
    } catch (err: any) {
      if (err.message === "INVALID_SETUP_TOKEN") {
        return res
          .status(400)
          .json({ message: "Invalid or expired setup token" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async refresh(req: Request, res: Response) {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const result = await authService.refresh(parsed.data);
      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message === "INVALID_REFRESH_TOKEN") {
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      await authService.logout(req.user!.id);
      return res.status(200).json({ message: "Logged out successfully" });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
