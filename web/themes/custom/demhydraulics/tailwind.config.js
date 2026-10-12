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
        // "Modern & Minimal" palette: primary #1F2937, secondary #64748B,
        // accent #F97316, dark #374151, light #F3F4F6. Token names kept
        // (ink/slate/amber/panel/paper) so templates need no changes.
        ink: {
          DEFAULT: "#1F2937",
          soft: "#263241",
          deep: "#161E2A",
        },
        panel: {
          DEFAULT: "#374151",
          light: "#414B5C",
        },
        amber: {
          DEFAULT: "#F97316",
          deep: "#EA580C",
          // Small amber text on white/paper: #EA580C only reaches 3.6:1.
          // This clears 4.5:1 on both while holding the brand hue.
          text: "#C2410C",
        },
        paper: {
          DEFAULT: "#F3F4F6",
          line: "#E5E7EB",
        },
        slate: {
          DEFAULT: "#64748B",
          soft: "#94A3B8",
        },
        steelgray: "#64748B",
        // Muted greys that still clear 4.5:1 — #64748B falls to 4.3:1 on
        // paper and #9CA3AF to 4.1:1 on the panel band.
        "mute-light": "#475569",
        "mute-dark": "#AAB2BF",
        "line-dark": "rgba(255,255,255,0.09)",
        "line-dark-2": "rgba(255,255,255,0.16)",
        // Legacy aliases used by existing templates (catalogue, nodes, …).
        brand: {
          DEFAULT: "#F97316",
          dark: "#EA580C",
          ink: "#1F2937",
        },
        steel: {
          50: "#F3F4F6",
          100: "#ECEEF1",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#94A3B8",
          500: "#475569",
          700: "#374151",
          900: "#1F2937",
        },
      },
      boxShadow: {
        panel: "0 24px 60px rgba(22, 30, 42, 0.18)",
        mega: "0 30px 60px rgba(22, 30, 42, 0.5)",
        chip: "0 18px 40px rgba(31, 41, 55, 0.28)",
      },
      backgroundImage: {
        "statistics-fallback":
          "radial-gradient(circle at top left, rgba(249, 115, 22, 0.14), transparent 32%), linear-gradient(135deg, #374151 0%, #1F2937 60%, #161E2A 100%)",
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
