import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import react from '../../../apps/web/node_modules/@vitejs/plugin-react/dist/index.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const repository=resolve(root,'../../..');
export default {
  root, plugins:[react()], publicDir:false,cacheDir:resolve(repository,'.local/teacher-home-prototype/vite-cache'),
  resolve:{alias:Object.fromEntries(['react','react-dom','three','lucide-react'].map(name=>[name,resolve(repository,'apps/web/node_modules',name)]))},
  server:{host:'127.0.0.1',port:4185,strictPort:true,fs:{allow:[repository]}},
  preview:{host:'127.0.0.1',port:4185,strictPort:true},
  build:{outDir:resolve(repository,'.local/teacher-home-prototype/dist'),emptyOutDir:true}
};
