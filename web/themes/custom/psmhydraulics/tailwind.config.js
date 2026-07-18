module.exports = {
  content: [
    "./**/*.twig",
    "./js/**/*.js",
    "./**/*.theme",
    "../../modules/custom/**/*.php",
    "../../modules/custom/**/*.twig",
    "../../modules/custom/**/*.yml",
  ],
  theme: {
    extend: {
      colors: {
        // Engineering-schematic palette. Amber = pressurised/active accent.
        ink: {
          DEFAULT: "#0C1A29",
          soft: "#0F2233",
          deep: "#08131E",
        },
        panel: {
          DEFAULT: "#16293B",
          light: "#1B3147",
        },
        amber: {
          DEFAULT: "#F7A21B",
          deep: "#D8870C",
        },
        paper: {
          DEFAULT: "#F4F6F8",
          line: "#E2E7EC",
        },
        slate: {
          DEFAULT: "#566472",
          soft: "#7A8896",
        },
        steelgray: "#7E909F",
        "line-dark": "rgba(255,255,255,0.09)",
        "line-dark-2": "rgba(255,255,255,0.16)",
        // Legacy aliases used by existing templates (catalogue, nodes, …).
        brand: {
          DEFAULT: "#F7A21B",
          dark: "#D8870C",
          ink: "#0C1A29",
        },
        steel: {
          50: "#F4F6F8",
          100: "#EDF0F3",
          200: "#E2E7EC",
          300: "#C9D4DE",
          400: "#7A8896",
          500: "#566472",
          700: "#243647",
          900: "#0C1A29",
        },
      },
      boxShadow: {
        panel: "0 24px 60px rgba(8, 18, 28, 0.18)",
        mega: "0 30px 60px rgba(8, 18, 28, 0.5)",
        chip: "0 18px 40px rgba(12, 26, 41, 0.28)",
      },
      backgroundImage: {
        "statistics-fallback":
          "radial-gradient(circle at top left, rgba(247, 162, 27, 0.14), transparent 32%), linear-gradient(135deg, #16293B 0%, #0C1A29 60%, #0A1622 100%)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Oswald", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      maxWidth: {
        shell: "77.5rem",
      },
      borderRadius: {
        brand: "3px",
      },
      transitionTimingFunction: {
        blueprint: "cubic-bezier(0.4, 0.1, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
