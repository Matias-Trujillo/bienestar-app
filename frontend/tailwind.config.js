/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        peralillo: {
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0077b6', // Azul institucional Peralillo
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          green: {
            50: '#f4f9ec',
            100: '#e7f4d4',
            200: '#d0eaae',
            300: '#a8db70',
            400: '#76b82a',
            500: '#65a30d', // Verde "PE" del logo
            600: '#558b2f', // Verde cinta del logo
            700: '#436b1f',
            800: '#365314',
            900: '#23370d',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            500: '#dc2626', // Rojo escudo y "RA"
            600: '#c02626',
            700: '#991b1b',
          },
          gold: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            500: '#ca8a04', // Dorado "LILLO" y torreón
            600: '#a16207',
            700: '#854d0e',
          },
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            500: '#ea580c', // Naranja "La comuna que soñamos"
            600: '#c2410c',
          },
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0077b6',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
    },
  },
  plugins: [],
};
