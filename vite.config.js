import {defineConfig} from 'vite';
export default defineConfig({optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1'},build:{rollupOptions:{output:{manualChunks:{three:['three','three/addons/loaders/GLTFLoader.js','three/addons/utils/BufferGeometryUtils.js']}}}}});
