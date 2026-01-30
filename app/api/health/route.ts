import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'gyana-spardha',
    version: '1.0.0',
  });
}

// Disable caching for health checks
export const dynamic = 'force-dynamic';
