import { NextRequest } from 'next/server';
import { userRepository } from '@/server/repositories/user.repository';
import { adminAuth } from '@/lib/firebase-admin';
import { UserAccount } from '@/lib/types';

export interface AuthenticatedContext {
  user: UserAccount;
  userId: string;
  adminRole: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isFinance: boolean;
  ipAddress: string;
}

/**
 * Extracts client IP address from trusted reverse-proxy headers.
 * Never returns a fake hardcoded IP when request headers are absent.
 */
export function getRequestIp(req?: NextRequest | Request | null): string {
  if (!req || !req.headers) return 'unknown';

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Authoritative server-side authentication.
 * Authenticates strictly via verified PostgreSQL session token or verified Firebase ID token.
 * Never trusts caller-supplied user ID headers (such as x-user-id).
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedContext | null> {
  const ipAddress = getRequestIp(req);

  // 1. Check HTTP-only cookie
  const cookieSession = req.cookies.get('session_token')?.value || req.cookies.get('session')?.value;

  // 2. Check Authorization Header (Bearer token)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const token = cookieSession || bearerToken;

  if (!token) {
    return null;
  }

  // A. Check PostgreSQL userSessions table
  const dbSession = await userRepository.findSession(token);
  if (dbSession) {
    const role = dbSession.adminRole;
    return {
      user: dbSession.user,
      userId: dbSession.user.id,
      adminRole: role || null,
      isAdmin: Boolean(role),
      isSuperAdmin: role === 'super_admin',
      isModerator: role === 'moderator' || role === 'super_admin',
      isFinance: role === 'finance_user' || role === 'super_admin',
      ipAddress,
    };
  }

  // B. Check Firebase ID Token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded && decoded.uid) {
      let user = await userRepository.findByUid(decoded.uid);
      if (!user && decoded.email) {
        user = await userRepository.findByEmail(decoded.email);
      }
      if (!user) {
        const newId = `usr_${decoded.uid.slice(0, 12)}`;
        user = (await userRepository.create({
          id: newId,
          uid: decoded.uid,
          name: decoded.name || 'Verified User',
          email: decoded.email || `${decoded.uid}@chillyads.com`,
          phone: decoded.phone_number || '',
          avatarUrl: decoded.picture || undefined,
        })) as any;
      }

      if (user) {
        const userAccount = await userRepository.findById(user.id);
        if (userAccount) {
          const role = user.adminRole;
          return {
            user: userAccount,
            userId: user.id,
            adminRole: role || null,
            isAdmin: Boolean(role),
            isSuperAdmin: role === 'super_admin',
            isModerator: role === 'moderator' || role === 'super_admin',
            isFinance: role === 'finance_user' || role === 'super_admin',
            ipAddress,
          };
        }
      }
    }
  } catch {
    // Token is not a valid Firebase ID token
  }

  return null;
}
