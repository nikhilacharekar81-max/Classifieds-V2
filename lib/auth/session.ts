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
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedContext | null> {
  // 1. Check HTTP-only cookie
  const cookieSession = req.cookies.get('session_token')?.value || req.cookies.get('session')?.value;

  // 2. Check Authorization Header (Bearer token)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const token = cookieSession || bearerToken;

  if (token) {
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
            };
          }
        }
      }
    } catch {
      // Token not a valid Firebase ID token; proceed to next fallback
    }
  }

  // 3. Demo / Development preview fallback: x-user-id header
  const demoUserId = req.headers.get('x-user-id');
  if (demoUserId) {
    const user = await userRepository.findById(demoUserId);
    if (user) {
      const role = (user as any).adminRole || (demoUserId.startsWith('adm_') ? 'super_admin' : null);
      return {
        user,
        userId: user.id,
        adminRole: role || null,
        isAdmin: Boolean(role),
        isSuperAdmin: role === 'super_admin',
        isModerator: role === 'moderator' || role === 'super_admin',
        isFinance: role === 'finance_user' || role === 'super_admin',
      };
    }
  }

  return null;
}
