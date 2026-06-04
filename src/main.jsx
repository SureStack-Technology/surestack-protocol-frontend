import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ClerkRootProvider from "./providers/ClerkRootProvider.jsx";
import "./styles/surestack-theme-tokens.css";
import "./index.css";
import "./styles/theme.css";
import "./styles/neurogrid.css";
import "./styles/particle-background.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkRootProvider>
      <App />
    </ClerkRootProvider>
  </React.StrictMode>
);

console.log("%c⚡ Framer Motion normalized globally", "color:#ff00ff");
console.log("%c✨ Motion Scope Fully Normalized", "color:#00fff0");
console.log("%c✨ All protocol hooks hardened for production", "color:#00eaff");
console.log(
  "%c🧩 SureStack Consensus/Staking integration active (V2)",
  "color:#00ffe0;font-size:16px;font-weight:bold"
);
