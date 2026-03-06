import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // react-apexcharts가 import하는 'apexcharts/client' 경로를 apexcharts ESM 빌드로 매핑
      'apexcharts/client': path.resolve(__dirname, 'node_modules/apexcharts/dist/apexcharts.esm.js'),
    },
  },
  plugins: [
    react(), 
    tailwindcss(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: 'named',
        namedExport: 'ReactComponent',
      }
    })
  ],
})
