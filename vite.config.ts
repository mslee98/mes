import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  server: {
    /** LAN·ngrok 등에서 접속할 때 리슨 (기본은 localhost만) */
    host: true,
    /**
     * ngrok 등 커스텀 Host 헤더 허용 (미설정 시 Vite가 요청 차단).
     * 터널 주소가 바뀌면 `.ngrok-free.app`로 같은 무료 도메인은 통과합니다.
     */
    allowedHosts: [
      // '9dd5-183-107-4-105.ngrok-free.app',
      // '.ngrok-free.app',
      // 'unousted-trigonometrical-hortensia.ngrok-free.dev'
    ],
  },
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
