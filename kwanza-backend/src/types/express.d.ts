import 'express-serve-static-core';

export type Role = 'STUDENT' | 'MENTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  sessionId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    user?: AuthUser;
  }
}
