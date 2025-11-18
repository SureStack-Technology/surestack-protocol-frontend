const fs = require("fs");
const path = require("path");

const envPath = path.resolve(process.cwd(), ".env.local");
const ALCHEMY_KEY = "VITE_ALCHEMY_RPC";
const ALCHEMY_URL = "https://eth-sepolia.g.alchemy.com/v2/bNeFYNjyA3WBfiuqbZZSN";

try {
  let content = "";
  if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, "utf8");

  if (content.includes(ALCHEMY_KEY)) {
    console.log(`✅ ${ALCHEMY_KEY} already exists in .env.local`);
  } else {
    fs.appendFileSync(
      envPath,
      `\n# Secondary RPC (Alchemy fallback)\n${ALCHEMY_KEY}=${ALCHEMY_URL}\n`
    );
    console.log(`🧩 Added ${ALCHEMY_KEY} to .env.local`);
  }
} catch (err) {
  console.error("❌ Error updating .env.local:", err);
  process.exit(1);
}

