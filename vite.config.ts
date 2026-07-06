import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    base: command === "build" ? "/mandala-pegawai/" : "/",
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        stream: path.resolve(__dirname, "./src/stubs/stream.ts"),
      },
    },
  };
});
