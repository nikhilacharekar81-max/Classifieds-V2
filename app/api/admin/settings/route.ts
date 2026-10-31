import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET() {
  const settings = await adminService.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext?.isSuperAdmin && !authContext?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await adminService.updateSettings(body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API /api/admin/settings PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
