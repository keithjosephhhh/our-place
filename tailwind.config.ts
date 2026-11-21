import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        blush: "rgb(var(--c-blush) / <alpha-value>)",
        rose: "rgb(var(--c-rose) / <alpha-value>)",
        powder: "rgb(var(--c-powder) / <alpha-value>)",
        ocean: "rgb(var(--c-ocean) / <alpha-value>)",
        sage: "rgb(var(--c-sage) / <alpha-value>)",
        butter: "rgb(var(--c-butter) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(101,91,87,0.25)",
      },
      keyframes: {
        drift: { "0%,100%": { transform: "translateX(0)" }, "50%": { transform: "translateX(24px)" } },
        beat: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.15)" } },
        twinkle: { "0%,100%": { opacity: "0.25" }, "50%": { opacity: "1" } },
      },
      animation: {
        drift: "drift 40s ease-in-out infinite",
        beat: "beat 2.4s ease-in-out infinite",
        twinkle: "twinkle 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [containerQueries],
};
export default config;
