// vite.config.ts
import { defineConfig } from "vite";

const FORCED_PREBUNDLE = [
  "react",
  "react-dom",
  "@mui/material",
  "@mui/system",
  "@mui/icons-material",
  "@emotion/react",
  "@emotion/styled",
];

export default defineConfig(async ({ mode }) => {
  // dynamic import of ESM-only plugins to avoid require() errors
  const reactPluginModule = await import("@vitejs/plugin-react").catch((e) => {
    console.error("Failed to import @vitejs/plugin-react:", e);
    throw e;
  });
  const reactPlugin = reactPluginModule?.default ?? reactPluginModule;

  // load visualizer only if ANALYZE=true, dynamically
  let visualizerPlugin: any = null;
  if (process.env.ANALYZE === "true") {
    const visMod = await import("rollup-plugin-visualizer").catch((e) => {
      console.warn("rollup-plugin-visualizer not available:", e);
      return null;
    });
    visualizerPlugin = visMod?.visualizer ?? visMod?.default ?? null;
  }

  return {
    plugins: [
      reactPlugin(),
      process.env.ANALYZE === "true" && visualizerPlugin
        ? visualizerPlugin({
            filename: "dist/stats.html",
            open: true,
            gzipSize: true,
          })
        : null,
    ].filter(Boolean),
    define: {
      "globalThis.__VITE_API_BASE__": JSON.stringify(
        process.env.VITE_API_BASE ?? ""
      ),
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) return "vendor";
            if (id.includes("@mui")) return "mui";
            if (id.includes("@tanstack")) return "react-query";
            if (id.includes("UploadPage")) return "upload";
            if (id.includes("lodash")) return "lodash";
            if (
              id.includes("chart.js") ||
              id.includes("recharts") ||
              id.includes("chartist")
            )
              return "charts";
            return "app";
          },
        },
      },
    },

    optimizeDeps: {
      include: FORCED_PREBUNDLE,
    },

    ssr: {
      noExternal: FORCED_PREBUNDLE,
    },
  };
});
