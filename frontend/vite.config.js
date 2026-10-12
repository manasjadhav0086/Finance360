import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function redirectBasePlugin() {
  return {
    name: 'redirect-base-plugin',
    configureServer(server) {
      server.middlewares.stack.unshift({
        route: '',
        handle: (req, res, next) => {
          const rawUrl = req.url || '';
          if (rawUrl === '/fin') {
            res.writeHead(302, { Location: '/fin/' });
            res.end();
            return;
          }
          if (rawUrl.startsWith('/fin?')) {
            res.writeHead(302, { Location: '/fin/' + rawUrl.slice(4) });
            res.end();
            return;
          }
          if (rawUrl === '/login' || rawUrl.startsWith('/login?') || rawUrl.startsWith('/login/')) {
            res.writeHead(302, { Location: '/fin' + rawUrl });
            res.end();
            return;
          }
          if (rawUrl === '/') {
            res.writeHead(302, { Location: '/fin/' });
            res.end();
            return;
          }
          next();
        },
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/fin/',
  plugins: [
    redirectBasePlugin(),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/fin/api': {
        target: 'http://127.0.0.1:4820',
        changeOrigin: true,
        secure: false,
      },
    },
  }
});
