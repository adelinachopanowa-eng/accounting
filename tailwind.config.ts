import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f4',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
      },
    },
  },
  plugins: [],
};

export default config;
