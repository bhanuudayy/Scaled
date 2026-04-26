import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f8fafc",
        line: "#e2e8f0",
        brand: "#2563eb",
        accent: "#0f766e"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(15, 23, 42, 0.12)",
        card: "0 10px 30px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: ["var(--font-manrope)"],
        mono: ["var(--font-jetbrains-mono)"]
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top, rgba(37, 99, 235, 0.14), transparent 38%), radial-gradient(circle at 80% 20%, rgba(15, 118, 110, 0.12), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
