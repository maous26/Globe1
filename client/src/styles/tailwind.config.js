module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
    },
    extend: {
      colors: {
        primary: '#1e293b', // bleu foncé
        accent: '#6366f1', // indigo/violet
        light: '#f3f4f6', // gris clair
        white: '#fff',
      },
    },
  },
  plugins: [],
}; 