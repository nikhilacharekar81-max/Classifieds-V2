import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const authContext = await getAuthenticatedUser(req);
  if (!authContext) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    user: authContext.user,
    adminRole: authContext.adminRole,
    isAdmin: authContext.isAdmin,
    isModerator: authContext.isModerator,
    isFinance: authContext.isFinance,
  });
}
