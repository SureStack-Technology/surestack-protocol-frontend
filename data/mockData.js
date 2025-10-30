export const stats = {
  totalCoverage: "$12,450,000",
  avgRiskIndex: "72.4",
  validatorsOnline: "142",
};

export const riskIndexData = [
  { day: "Mon", index: 68 },
  { day: "Tue", index: 72 },
  { day: "Wed", index: 70 },
  { day: "Thu", index: 74 },
  { day: "Fri", index: 76 },
];

export const coveragePools = [
  { name: "Stablecoin Depeg", size: "$4.5M", rate: "2.1%", policies: 310, status: "Active" },
  { name: "Oracle Failure", size: "$2.3M", rate: "1.7%", policies: 180, status: "Active" },
  { name: "Exchange Downtime", size: "$1.8M", rate: "3.2%", policies: 95, status: "Active" },
];

export const validators = [
  { id: "Validator-101", accuracy: "98.4%", staked: "15,000 SST", rewards: "2,340 SST" },
  { id: "Validator-142", accuracy: "95.7%", staked: "12,400 SST", rewards: "1,890 SST" },
  { id: "Validator-203", accuracy: "97.1%", staked: "8,200 SST", rewards: "1,430 SST" },
];

export const proposals = [
  { id: "#12", title: "Adjust Validator Tier Requirements", status: "Active" },
  { id: "#13", title: "Increase Burn Rate to 25%", status: "Passed" },
  { id: "#14", title: "Introduce Tier-0 Validator Delegation", status: "Voting" },
];

export const protocolFeed = [
  "New coverage added: Stablecoin Depeg Pool",
  "Validator Node #102 updated risk feed",
  "Oracle Failure pool reached capacity",
  "New validator #203 joined the network",
  "Governance proposal #14 opened for voting",
];

