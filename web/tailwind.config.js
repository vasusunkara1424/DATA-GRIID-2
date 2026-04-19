/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0a0a0f",
        surface: "#111118",
        surface2:"#17171f",
        border:  "#2a2a38",
        accent:  "#00e5ff",
        accent2: "#7c3aed",
        accent3: "#f59e0b",
        muted:   "#6b6b80",
      },
    },
  },
  plugins: [],
}
