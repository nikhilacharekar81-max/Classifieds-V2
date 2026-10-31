import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/server/services/user.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const users = await userService.getUsers(filter);
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('API /api/admin/users GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, userId, reason, status, notes } = await req.json();

    if (action === 'ban' && userId) {
      const success = await userService.banUser(userId, reason || 'Violated terms of service');
      return NextResponse.json({ success });
    }

    if (action === 'unban' && userId) {
      const success = await userService.unbanUser(userId);
      return NextResponse.json({ success });
    }

    if (action === 'verify_kyc' && userId) {
      const success = await userService.verifyKyc(userId, status || 'verified', notes);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Unsupported user action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/admin/users POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
