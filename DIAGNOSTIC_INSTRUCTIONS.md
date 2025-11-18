# 🧠 SureStack Deep Runtime Diagnostic – Instructions

## Purpose
Collect and analyze full runtime diagnostics to identify whether the white screen originates from:
- React render failure
- Three.js (NeuroGridBackground) WebGL crash
- ABI / contract initialization error

---

## ✅ STEP 1 — Health Check

Visit: **http://localhost:3007/health**

- ✅ **Green 'SureStack HealthCheck'** = React rendering OK
- ❌ **Blank screen** = index/bootstrap issue

---

## 🧩 STEP 2 — View Tracer Logs

1. Open DevTools (F12 → Console)
2. Type:
   ```javascript
   window.__surestackLogs?.slice(0,40)
   ```
3. Copy & note the first 40 entries

**Expected logs:**
- `[SureStack] DeepProbe.Install`
- `[SureStack] App.Mounted`
- `[SureStack] Trace.Mount { component: 'NeuroGridBackground' }`
- `[SureStack] Trace.Render { component: 'Dashboard' }`
- `[SureStack] ReactErrorBoundary` (if component crashes)
- `[SureStack] Contract.Init.Error` (if ABI/contract issues)

---

## 🧱 STEP 3 — Isolation Toggles

Test each one individually (save, reload between):

### A) Disable Background
In `src/layouts/MainLayout.jsx`, comment out:
```jsx
{/* <TNeuroGridBackground /> */}
```

### B) Bypass Contracts
In `src/hooks/useContracts.js`, temporarily:
```javascript
export const useContracts = () => {
  return {
    oracleReader: null,
    policyManager: null,
    rewardPool: null,
    consensusStakingV2: null,
    daoGovernance: null,
    sureStackToken: null,
  }
}
```

### C) Disable Route Components
In `src/App.jsx`, comment all routes except one:
```jsx
{/* <Route index element={<TDashboard />} /> */}
{/* <Route path="policies" element={<TPolicyPanel />} /> */}
```

**After each change, reload http://localhost:3007 and note if UI appears.**

---

## 🧪 STEP 4 — Quick Diagnostic Questions

Answer these:

1. ✅ Does `/health` render correctly?
2. ✅ Which component's `Trace.Mount` was last before the white screen?
3. ✅ Are there any `[SureStack] ReactErrorBoundary` or `Contract.Init.Error` logs?
4. ✅ Did disabling `NeuroGridBackground` restore rendering?

---

## 🧠 STEP 5 — Save Diagnostic Snapshot

Run this in DevTools Console to export the trace:

```javascript
const blob = new Blob([JSON.stringify(window.__surestackLogs||[],null,2)],{type:'application/json'});
const url = URL.createObjectURL(blob);
console.log('Download logs →', url);
// Click the URL to download the JSON file
```

---

## 📤 STEP 6 — Share Findings

Return with:
- Result of `/health` check
- The last component name logged before crash
- Any `ReactErrorBoundary` / `Contract.Init.Error` entries
- Which toggle (A/B/C) made UI appear

---

## Expected Outcome

✅ Identify whether the white screen is caused by:
- **React crash** in a component (ErrorBoundary logs it)
- **NeuroGridBackground** (R3F/Three.js renderer fault)
- **ABI or ethers contract initialization error**
- **Router or layout misrendering**

---

## 🔍 Additional Debugging

### Check Terminal Logs
```bash
tail -f /tmp/surestack-diagnostic.log
```

### Toggle Tracing at Runtime
In DevTools Console:
```javascript
window.__SURESTACK_TRACE = true  // Enable
window.__SURESTACK_TRACE = false // Disable
```

### View All Logs
```javascript
window.__surestackLogs  // Full buffer (up to 2000 entries)
```

---

## 🚨 Common Issues & Solutions

### White Screen + No Logs
- Check if `src/main.jsx` is loading
- Verify `index.html` has `<div id="root"></div>`
- Check browser console for syntax errors

### White Screen + ReactErrorBoundary Logs
- Component crashed during render
- Check `componentStack` in logs for exact component
- Look for undefined props or missing imports

### White Screen + Contract.Init.Error
- ABI file missing or malformed
- Contract address invalid
- Check `.env.local` for missing addresses

### White Screen + NeuroGridBackground Mounts but No Render
- Three.js version mismatch
- WebGL context creation failed
- Check browser WebGL support


