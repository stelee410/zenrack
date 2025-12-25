import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GEMINI_API_KEY || '';
    
    if (!apiKey && mode === 'development') {
      console.warn('⚠️  警告: GEMINI_API_KEY 未在 .env.local 中设置');
    }
    
    return {
      server: {
        port: 3000,
        host: 'localhost',
        strictPort: false,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
