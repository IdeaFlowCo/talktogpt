const defaultTheme = require('tailwindcss/defaultTheme');
const { nextui } = require("@nextui-org/react");

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        satoshi: ['Satoshi', 'sans-serif'],
      },
    },
    // fontFamily: {
    //     sans: ["Satoshi", "sans-serif"],
    // },

    // Default projects breakpoints
    // https://tailwindcss.com/docs/screens
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      //"2xl": "1536px",
    },
  },
  darkMode: 'class',
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar-hide'),
    require('@tailwindcss/line-clamp'),
    nextui(),
  ],
};
