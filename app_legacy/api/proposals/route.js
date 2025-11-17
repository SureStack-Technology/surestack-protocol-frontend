import { NextResponse } from 'next/server';
import { proposals as mockProposals } from '../../../data/mockData';

export async function GET() {
  try {
    // Try to fetch from backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/governance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.proposals) {
        return NextResponse.json(data.data.proposals);
      }
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error.message);
  }

  // Fallback to mock data
  const dynamicProposals = mockProposals.map(proposal => ({
    ...proposal,
    // Occasionally add new proposals
    ...(Math.random() > 0.8 && {
      id: `#${Math.floor(Math.random() * 100) + 15}`,
      title: "Dynamic Protocol Parameter Adjustment",
      status: "Active",
    }),
  }));
  
  return NextResponse.json(dynamicProposals);
}
