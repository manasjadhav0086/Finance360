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
          if (rawUrl === '/') {
            res.writeHead(302, { Location: '/fin/' });
            res.end();
            return;
          }

          // If path does not start with /fin and is not a Vite internal or static asset request
          if (
            !rawUrl.startsWith('/fin/') &&
            !rawUrl.startsWith('/@') &&
            !rawUrl.startsWith('/src/') &&
            !rawUrl.startsWith('/node_modules/') &&
            !rawUrl.startsWith('/favicon.') &&
            !rawUrl.match(/\.(js|jsx|ts|tsx|css|json|png|jpg|jpeg|svg|ico|woff|woff2)$/i)
          ) {
            res.writeHead(302, { Location: '/fin' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl) });
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
