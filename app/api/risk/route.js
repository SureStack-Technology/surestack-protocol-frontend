import { NextResponse } from 'next/server';
import { stats } from '../../../data/mockData';

export async function GET() {
  // Simulate slight variations in the data
  const dynamicStats = {
    ...stats,
    totalCoverage: `$${(12450000 + Math.random() * 100000).toLocaleString()}`,
    avgRiskIndex: (72.4 + (Math.random() - 0.5) * 2).toFixed(1),
    validatorsOnline: (142 + Math.floor(Math.random() * 3)).toString(),
  };
  
  return NextResponse.json(dynamicStats);
}
