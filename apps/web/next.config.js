const path = require('path');
// El .env.local vive en la raíz del monorepo (mismas claves que escritorio y motor).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

/** @type {import('next').NextConfig} */
module.exports = {
  // Compila los paquetes del monorepo (son TS sin build previo).
  transpilePackages: ['@ultrathing/ui', '@ultrathing/core', '@ultrathing/api-client'],
};
