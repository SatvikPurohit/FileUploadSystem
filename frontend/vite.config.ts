import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    // start broad, then narrow once you find the package
    exclude: ["your-suspected-package"],
  },
  // enable more logs
  logLevel: "info",
});
