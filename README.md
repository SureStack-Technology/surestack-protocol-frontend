# RISK Protocol - Frontend MVP

A decentralized risk assessment and coverage network frontend built with Next.js 14, featuring real-time risk scores, coverage pools, and validator dashboards.

## 🚀 Features

- **Dashboard**: Real-time protocol metrics and risk index visualization
- **Coverage Pools**: Browse and purchase coverage from active risk pools
- **Validator Dashboard**: Monitor validator performance and accuracy
- **Governance**: Participate in protocol governance and vote on proposals

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS + Custom Glassmorphism Design
- **Charts**: Recharts
- **Icons**: Lucide-react
- **UI Components**: Radix UI primitives
- **Font**: Inter

## 🎨 Design System

- **Theme**: Dark mode with glassmorphism effects
- **Colors**: 
  - Background: `#0B0C10`
  - Text: `#E5E7EB`
  - Accent: `#4F46E5`
- **Components**: Rounded corners (`rounded-2xl`), subtle shadows, responsive design

## 📁 Project Structure

```
├── app/
│   ├── layout.jsx          # Root layout with header and footer
│   ├── page.jsx            # Dashboard page
│   ├── coverage/page.jsx   # Coverage pools page
│   ├── validators/page.jsx # Validator dashboard page
│   ├── governance/page.jsx # Governance proposals page
│   └── globals.css         # Global styles and TailwindCSS
├── components/
│   ├── Header.jsx          # Navigation header
│   ├── StatCard.jsx        # Reusable stat display card
│   ├── ChartCard.jsx       # Chart wrapper component
│   └── Table.jsx           # Reusable table with modal support
├── data/
│   └── mockData.js         # Sample data for all pages
└── package.json            # Dependencies and scripts
```

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Pages Overview

### Dashboard (`/`)
- Protocol overview with key metrics
- Risk index chart over time
- Live protocol feed with recent activities

### Coverage Pools (`/coverage`)
- Table of active coverage pools
- Purchase coverage with modal confirmation
- Pool details and premium calculations

### Validators (`/validators`)
- Validator performance table
- Accuracy distribution chart
- Staking and rewards information

### Governance (`/governance`)
- Active governance proposals
- Voting interface
- Proposal status tracking

## 🎯 Key Components

- **StatCard**: Displays metrics with icons and hover effects
- **ChartCard**: Wrapper for Recharts with dark theme styling
- **Table**: Responsive table with action buttons and modal support
- **Header**: Navigation with active state highlighting

## 🔧 Customization

The app uses mock data from `/data/mockData.js`. To integrate with real APIs:

1. Replace mock data imports with API calls
2. Add loading states and error handling
3. Implement real wallet connection logic
4. Add authentication and user management

## 📄 License

© 2025 RISK Protocol – Zug Foundation.
