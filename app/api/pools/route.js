import { NextResponse } from 'next/server';
import { coveragePools } from '../../../data/mockData';

export async function GET() {
  // Simulate dynamic pool data
  const dynamicPools = coveragePools.map(pool => ({
    ...pool,
    policies: pool.policies + Math.floor(Math.random() * 10),
    size: pool.size.replace(/[\d.]+/, (match) => {
      const num = parseFloat(match);
      return (num + Math.random() * 0.1).toFixed(1);
    }),
  }));
  
  return NextResponse.json(dynamicPools);
}
