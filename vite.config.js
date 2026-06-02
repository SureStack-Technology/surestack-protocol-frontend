import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "http://localhost:5001";

  return defineConfig({
    root: ".",
    plugins: [react()],

    define: {
      "process.env": env,
    },

    server: {
      proxy: {
        "^/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    preview: {
      proxy: {
        "^/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    optimizeDeps: {
      include: [
        "zustand",
        "zustand/middleware",
        "use-sync-external-store",
        "use-sync-external-store/shim",
        "recharts",
        "react-hot-toast",
        "framer-motion",
        "lucide-react",
        "react-icons",
        "react-router-dom",
        "react-tsparticles",
        "tsparticles-slim"
      ],
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "./src/shared"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
        "@config": path.resolve(__dirname, "./src/config"),
      },
    },
  });
};
