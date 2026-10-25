import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'kwanza-oportunidades';
const AUDIENCE = 'kwanza-api';

export interface AccessClaims {
  userId: string;
  sessionId: string;
}

export class JwtService {
  private key: Uint8Array;
  constructor(secret: string, private readonly ttlMs: number) {
    this.key = new TextEncoder().encode(secret);
  }

  async signAccess(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + this.ttlMs) / 1000))
      .sign(this.key);
  }

  async verifyAccess(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }
}
