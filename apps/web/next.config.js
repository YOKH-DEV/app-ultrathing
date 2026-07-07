/** @type {import('next').NextConfig} */
module.exports = {
  // Compila los paquetes del monorepo (son TS sin build previo).
  transpilePackages: ['@ultrathing/ui', '@ultrathing/core', '@ultrathing/api-client'],
};
