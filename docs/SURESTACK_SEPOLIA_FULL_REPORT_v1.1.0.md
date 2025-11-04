# SureStack Protocol — Sepolia Oracle Integration & Manual Testing Report (v1.1.0)
**Date:** November 4, 2025  
**Prepared by:** David Bonilla  
**Environment:** Sepolia Test Network (Infura + Chainlink + Localhost)

---

## 1. System Overview
SureStack Protocol integrates blockchain smart contracts, Chainlink price oracles, and a Next.js frontend dashboard for real-time decentralized risk management.

**Architecture Summary:**
| Layer | Technology | Purpose |
|-------|-------------|----------|
| Frontend | Next.js (React) | Visualization dashboard |
| Backend | Express.js | API bridge between blockchain and frontend |
| Blockchain | Sepolia via Infura | Smart contract execution |
| Oracle | Chainlink ETH/USD feed | Real-time market data |
| Testing | Insomnia + Browser | Manual API verification |

---

## 2. Environment Configuration
### Backend (.env)
- PORT=5001  
- INFURA_API_URL=https://sepolia.infura.io/v3/b53f7b7e8e3e4dfd8244abc1d3364c83  
- ORACLE_CONTRACT_ADDRESS=0x67369fEB3f658402702D214BA28d0165a93B3453  
- CHAINLINK_ORACLE=0x694AA1769357215DE4FAC081bf1f309aDC325306  

### Frontend (.env.local)
- NEXT_PUBLIC_BACKEND_URL=http://localhost:5001  
- NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/b53f7b7e8e3e4dfd8244abc1d3364c83  
- NEXT_PUBLIC_CHAIN_NAME=Sepolia  
- NEXT_PUBLIC_CHAIN_ID=11155111  

✅ Verified synchronization between backend and frontend environments  
✅ Confirmed Infura + Chainlink integration via Sepolia  

---

## 3. API Endpoints (Manual Testing)
All endpoints tested manually via **Insomnia** and **Browser GET requests**.

| Endpoint | Method | Purpose | Result | Tool |
|-----------|---------|----------|---------|------|
| `/health` | GET | Check backend uptime | ✅ 200 OK | Browser/Insomnia |
| `/api/oracle` | GET | Fetch live ETH/USD price from Chainlink Oracle | ✅ Success | Browser/Insomnia |
| `/api/coverage` | GET | Retrieve coverage pool list | ✅ Success | Insomnia |
| `/api/governance` | GET | Governance proposals & config | ✅ Success | Insomnia |
| `/api/validators` | GET | Validator statistics | ✅ Success | Insomnia |

---

## 4. Example Responses

### `/api/oracle`
```json
{
  "success": true,
  "data": {
    "price": 3636.23,
    "description": "ETH / USD",
    "oracleAddress": "0x694AA1769357215DE4FAC081bf1f309aDC325306"
  },
  "fetchedAt": "2025-11-04T02:47:55.321Z"
}

