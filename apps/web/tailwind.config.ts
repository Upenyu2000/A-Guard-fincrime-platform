import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "Segoe UI", "Arial", "sans-serif"],
      },
      colors: {
        guard: {
          violet: "#7C3AED",
          purple: "#A855F7",
          ink: "#080812",
          glass: "rgba(255,255,255,0.08)",
          line: "rgba(255,255,255,0.14)",
          teal: "#2dd4bf",
          amber: "#f59e0b",
          rose: "#fb7185",
        },
      },
      boxShadow: {
        glass: "0 18px 60px rgba(0, 0, 0, 0.32)",
        glow: "0 0 36px rgba(168, 85, 247, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
