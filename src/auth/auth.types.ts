import { Request } from 'express';

export interface AuthenticatedIdentity {
  subject: string;
  actor: string;
}

export interface AuthenticatedRequest extends Request {
  authIdentity?: AuthenticatedIdentity;
}
