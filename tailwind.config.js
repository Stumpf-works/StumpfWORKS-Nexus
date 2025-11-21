/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // macOS-inspired color palette
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.8)",
          dark: "rgba(30, 30, 30, 0.8)",
        },
        sidebar: {
          DEFAULT: "rgba(246, 246, 246, 0.9)",
          dark: "rgba(36, 36, 38, 0.9)",
        },
        accent: {
          DEFAULT: "#0A84FF",
          hover: "#0077ED",
          light: "#409CFF",
        },
        border: {
          DEFAULT: "rgba(0, 0, 0, 0.1)",
          dark: "rgba(255, 255, 255, 0.1)",
        },
        text: {
          primary: "#1D1D1F",
          secondary: "#86868B",
          "primary-dark": "#F5F5F7",
          "secondary-dark": "#A1A1A6",
        },
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "Menlo",
          "Monaco",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },
      backdropBlur: {
        xs: "2px",
        macos: "20px",
      },
      borderRadius: {
        macos: "10px",
        "macos-lg": "14px",
      },
      boxShadow: {
        macos: "0 22px 70px 4px rgba(0, 0, 0, 0.2)",
        "macos-sm": "0 4px 12px rgba(0, 0, 0, 0.08)",
        "macos-inset": "inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
