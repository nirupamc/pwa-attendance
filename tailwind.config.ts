import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#1A1A1A",
        "surface-2": "#2A2A2A",
        primary: "#FFD700",
        "primary-dark": "#C8A800",
        "primary-light": "#FFE44D",
        "text-primary": "#F5F5F0",
        "text-muted": "rgba(245,245,240,0.5)",
        success: "#4CAF50",
        danger: "#FF5252",
        warning: "#FF8A4C",
        border: "rgba(255,215,0,0.15)",
      },
      fontFamily: {
        heading: ["var(--font-bebas)", "system-ui", "sans-serif"],
        body: ["var(--font-space)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
