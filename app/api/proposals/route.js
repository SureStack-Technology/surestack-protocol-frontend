import { NextResponse } from 'next/server';
import { proposals } from '../../../data/mockData';

export async function GET() {
  // Simulate dynamic proposal data
  const dynamicProposals = proposals.map(proposal => ({
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
