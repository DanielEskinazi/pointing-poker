import { TokenPayload } from './api';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}