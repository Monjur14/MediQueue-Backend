declare global {
  namespace Express {
    interface Request {
      user?: {
        id:       string;
        email:    string;
        role:     string;
        tenantId: string | null;
      };
    }
  }
}

export {};