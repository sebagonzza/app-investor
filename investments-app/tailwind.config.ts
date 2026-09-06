import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f6",
          100: "#d9f0e6",
          500: "#0f8a5f",
          600: "#0c6f4c",
          700: "#0a5a3e",
          900: "#073a29",
        },
      },
    },
  },
  plugins: [],
};
export default config;
