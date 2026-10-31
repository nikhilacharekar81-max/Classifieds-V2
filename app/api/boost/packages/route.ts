import { NextRequest, NextResponse } from 'next/server';
import { boostService } from '@/server/services/boost.service';

export async function GET() {
  const packages = boostService.getPackages();
  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pkg = boostService.createPackage(body);
    return NextResponse.json(pkg, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating package' }, { status: 500 });
  }
}
