import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Lightweight query to keep connection alive
    const result = await executeQuery<{ timestamp: string }>('SELECT GETDATE() as timestamp');

    return NextResponse.json({
      status: 'connected',
      timestamp: result[0]?.timestamp,
      message: 'Database connection is active'
    });
  } catch (error) {
    console.error('Keep-alive failed:', error);
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: 'disconnected',
        error: 'Database connection failed',
        details: process.env.NODE_ENV !== 'production' ? message : undefined
      },
      { status: 500 }
    );
  }
}