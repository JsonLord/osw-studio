import { NextResponse } from 'next/server';

export async function GET() {
  const serverMode = process.env.NEXT_PUBLIC_SERVER_MODE === 'true';
  return NextResponse.json(
    {
      ok: true,
      name: 'osw-studio',
      version: process.env.npm_package_version ?? '1.84.0',
      mode: serverMode ? 'server' : 'browser',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
