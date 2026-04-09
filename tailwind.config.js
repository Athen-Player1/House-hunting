/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "inverse-surface": "#2e3132",
        "surface-container": "#edeeef",
        secondary: "#47607e",
        "on-tertiary": "#ffffff",
        "on-secondary-container": "#48617e",
        tertiary: "#000000",
        error: "#ba1a1a",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f8f9fa",
        "on-surface": "#191c1d",
        "tertiary-fixed": "#ffdbc9",
        background: "#f8f9fa",
        outline: "#74777d",
        "primary-container": "#0f1c2c",
        "error-container": "#ffdad6",
        "primary-fixed-dim": "#bac8dc",
        "tertiary-container": "#331200",
        "on-background": "#191c1d",
        "surface-tint": "#525f71",
        "secondary-fixed-dim": "#afc9ea",
        "on-primary-fixed": "#0f1c2c",
        "secondary-fixed": "#d1e4ff",
        primary: "#000000",
        "outline-variant": "#c4c6cc",
        "on-tertiary-fixed-variant": "#763300",
        "surface-container-high": "#e7e8e9",
        "secondary-container": "#c2dcff",
        surface: "#f8f9fa",
        "surface-container-low": "#f3f4f5",
        "on-secondary-fixed": "#001d36",
        "on-error-container": "#93000a",
        "surface-container-highest": "#e1e3e4",
        "on-tertiary-fixed": "#331200",
        "surface-container-lowest": "#ffffff",
        "tertiary-fixed-dim": "#ffb68d",
        "primary-fixed": "#d6e4f9",
        "inverse-primary": "#bac8dc",
        "on-secondary-fixed-variant": "#2f4865",
        "surface-variant": "#e1e3e4",
        "on-secondary": "#ffffff",
        "on-primary": "#ffffff",
        "on-surface-variant": "#44474c",
        "on-tertiary-container": "#ce671e",
        "on-primary-fixed-variant": "#3a4859",
        "inverse-on-surface": "#f0f1f2",
        "on-primary-container": "#778598",
        "on-error": "#ffffff"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Inter", "sans-serif"]
      },
      boxShadow: {
        editorial: "0 24px 80px rgba(15, 28, 44, 0.10)",
        soft: "0 10px 30px rgba(15, 28, 44, 0.08)"
      }
    }
  },
  plugins: []
};
