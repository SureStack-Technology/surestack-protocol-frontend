import { NextResponse } from 'next/server';
import { validators } from '../../../data/mockData';

export async function GET() {
  // Simulate dynamic validator data
  const dynamicValidators = validators.map(validator => ({
    ...validator,
    accuracy: (parseFloat(validator.accuracy) + (Math.random() - 0.5) * 0.5).toFixed(1) + '%',
    rewards: `${(parseInt(validator.rewards.replace(/[^\d]/g, '')) + Math.floor(Math.random() * 50)).toLocaleString()} RISK`,
  }));
  
  return NextResponse.json(dynamicValidators);
}
