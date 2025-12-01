import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"], // pick the themes you want
    styled: true,              // ensures btn-primary has proper styles
    base: true,
    utils: true,
    logs: true,
    rtl: false,
  },
};
