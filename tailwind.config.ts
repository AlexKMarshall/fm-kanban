import type { Config } from "tailwindcss";
import tailwindForms from "@tailwindcss/forms";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [tailwindForms],
} satisfies Config;
