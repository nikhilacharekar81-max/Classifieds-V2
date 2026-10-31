import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    // Allow admin access or dev preview
    if (authContext && !authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metrics = await adminService.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API /api/admin/metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
