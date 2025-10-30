import { NextResponse } from 'next/server';
import { coveragePools as mockPools } from '../../../data/mockData';

export async function GET() {
  try {
    // Try to fetch from backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/coverage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.pools) {
        return NextResponse.json(data.data.pools);
      }
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error.message);
  }

  // Fallback to mock data
  const dynamicPools = mockPools.map(pool => ({
    ...pool,
    policies: pool.policies + Math.floor(Math.random() * 10),
    size: pool.size.replace(/[\d.]+/, (match) => {
      const num = parseFloat(match);
      return (num + Math.random() * 0.1).toFixed(1);
    }),
  }));
  
  return NextResponse.json(dynamicPools);
}
