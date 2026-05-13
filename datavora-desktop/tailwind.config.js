/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        surface: "#111113",
        elevated: "#18181B",
        border: "rgba(255,255,255,0.08)",
        accent: "#7C3AED",
        accentHover: "#8B5CF6",
        text: "#FAFAFA",
        muted: "#71717A",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
