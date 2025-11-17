import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/oracle`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Fallback to mock data if backend unavailable
    return NextResponse.json({
      success: true,
      data: {
        price: 3425.67,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        description: 'ETH / USD (Fallback)',
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Oracle fetch error:', error);
    
    // Return fallback data
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        price: 3425.67,
        currency: 'USD',
        description: 'ETH / USD (Mock)',
      },
      fetchedAt: new Date().toISOString(),
    });
  }
}

