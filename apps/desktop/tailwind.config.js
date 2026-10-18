const preset = require('@ultrathing/ui/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Mismo preset compartido que la web: un solo tema negro/dorado.
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/features/src/**/*.{ts,tsx}',
  ],
};
