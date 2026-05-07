// Module augmentation: `req.user` exists on every Express Request after
// requireAuth has run. Routes that depend on it should run requireAuth first
// and then assert with the authed() helper if they want a non-null type.

import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        full_name: string | null;
      };
    }
  }
}
