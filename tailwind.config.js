/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          dark: "rgba(10, 10, 15, 0.85)",
        },
        sidebar: {
          DEFAULT: "rgba(246, 246, 246, 0.7)",
          dark: "rgba(15, 15, 20, 0.9)",
        },
        glass: {
          light: "rgba(255, 255, 255, 0.1)",
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          dark: "rgba(0, 0, 0, 0.3)",
          darker: "rgba(0, 0, 0, 0.5)",
        },
        accent: {
          DEFAULT: "#0A84FF",
          hover: "#0077ED",
          light: "#409CFF",
          glow: "rgba(10, 132, 255, 0.3)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          dark: "rgba(255, 255, 255, 0.05)",
          light: "rgba(255, 255, 255, 0.2)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1A6",
          tertiary: "#6E6E73",
          "primary-dark": "#F5F5F7",
          "secondary-dark": "#A1A1A6",
        },
        success: "#34C759",
        warning: "#FF9500",
        error: "#FF3B30",
        purple: "#AF52DE",
        pink: "#FF2D55",
        teal: "#5AC8FA",
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
        sm: "4px",
        DEFAULT: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
        "3xl": "64px",
      },
      backdropSaturate: {
        180: "1.8",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
        "glass-lg": "0 12px 48px 0 rgba(0, 0, 0, 0.45)",
        glow: "0 0 20px rgba(10, 132, 255, 0.3)",
        "glow-lg": "0 0 40px rgba(10, 132, 255, 0.4)",
        inner: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        "inner-dark": "inset 0 1px 0 0 rgba(0, 0, 0, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(10, 132, 255, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(10, 132, 255, 0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-glass": "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
      },
    },
  },
  plugins: [],
};
