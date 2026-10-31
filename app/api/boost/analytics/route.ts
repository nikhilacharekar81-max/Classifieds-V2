import { NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function GET() {
  const analytics = boostService.getBoostAnalytics();
  return NextResponse.json(analytics);
}
