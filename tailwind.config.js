export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { ink: '#07070a', panel: '#13131a', line: '#26262f', max: '#e50914' },
    fontFamily: { display: ['"Bebas Neue"', 'Impact', 'sans-serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] }
  } },
  plugins: []
}
