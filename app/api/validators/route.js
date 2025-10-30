import { NextResponse } from 'next/server';
import { validators as mockValidators } from '../../../data/mockData';

export async function GET() {
  try {
    // Try to fetch from backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/validators`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.validators) {
        return NextResponse.json(data.data.validators);
      }
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error.message);
  }

  // Fallback to mock data if backend is unavailable
  const dynamicValidators = mockValidators.map(validator => ({
    ...validator,
    accuracy: (parseFloat(validator.accuracy) + (Math.random() - 0.5) * 0.5).toFixed(1) + '%',
    rewards: `${(parseInt(validator.rewards.replace(/[^\d]/g, '')) + Math.floor(Math.random() * 50)).toLocaleString()} RISK`,
  }));
  
  return NextResponse.json(dynamicValidators);
}
