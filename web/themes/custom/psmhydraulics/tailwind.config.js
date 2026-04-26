module.exports = {
  content: [
    "./**/*.twig",
    "./src/**/*.js",
    "./**/*.theme",
    "../../modules/custom/**/*.php",
    "../../modules/custom/**/*.twig",
    "../../modules/custom/**/*.yml",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#f0a500",
          dark: "#d18f00",
          ink: "#132238",
        },
        steel: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          700: "#334155",
          900: "#0f172a",
        },
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 23, 42, 0.12)",
      },
      backgroundImage: {
        "statistics-fallback":
          "radial-gradient(circle at top left, rgba(240, 165, 0, 0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(148, 163, 184, 0.14), transparent 30%), linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 55%, rgba(19, 34, 56, 0.92) 100%)",
      },
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        shell: "78rem",
      },
    },
  },
  plugins: [],
};
