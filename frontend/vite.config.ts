import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Lê BACKEND_PORT/FRONTEND_PORT do .env da raiz, com frontend/.env como
  // override opcional (sem mudar o envDir padrão do Vite).
  const raiz = resolve(process.cwd(), '..');
  const env = { ...loadEnv(mode, raiz, ''), ...loadEnv(mode, process.cwd(), '') };
  const portaBackend = Number(process.env.BACKEND_PORT ?? env.BACKEND_PORT ?? 3001) || 3001;
  const portaFrontend = Number(process.env.FRONTEND_PORT ?? env.FRONTEND_PORT ?? 3000) || 3000;

  return {
    plugins: [tailwindcss()],
    server: {
      port: portaFrontend,
      proxy: {
        '/api': `http://localhost:${portaBackend}`,
      },
    },
    preview: {
      port: portaFrontend,
    },
  };
});
