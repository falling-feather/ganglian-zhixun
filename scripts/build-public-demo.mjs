import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {courseRegionAssignments, courseFieldLessonsV3} from '../packages/course-content/dist/index.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const web=resolve(root,'apps/web');
const output=resolve(root,'.local/public-student-demo/dist');
const require=createRequire(resolve(web,'package.json'));
const {build}=await import(pathToFileURL(require.resolve('vite')).href);
const {default:react}=await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
const mediaBase=process.env.PUBLIC_ASSET_ORIGIN?process.env.PUBLIC_ASSET_ORIGIN.replace(/\/$/u,'')+'/':'';
if(mediaBase&&new URL(mediaBase).protocol!=='https:')throw new Error('Public media origin must use HTTPS');
const sharedMedia=mediaBase?{name:'shared-public-media',enforce:'pre',transform(source,id){
  return id.endsWith('.css')?source.replace(/url\((['"]?)\/assets\/([^)'"\s]+)\1\)/gu,(_match,_quote,path)=>`url("${mediaBase}assets/${path}")`):null;
}}:null;
await build({root:web,configFile:false,base:'./',define:{'import.meta.env.VITE_PUBLIC_ASSET_BASE':JSON.stringify(mediaBase)},plugins:[react(),...(sharedMedia?[sharedMedia]:[])],build:{outDir:output,emptyOutDir:true,copyPublicDir:!mediaBase,rollupOptions:{input:resolve(web,'public-demo.html')}}});
await rename(resolve(output,'public-demo.html'),resolve(output,'index.html'));
const catalog=courseRegionAssignments.map(meta=>{
  const original=courseFieldLessonsV3.find(item=>item.courseId===meta.courseId);
  if(!original)throw new Error(`Missing lesson for ${meta.courseId}`);
  const {title,assignment,initialNodeId,nodes,people,materials,strategies,workPlan}=original.lesson;
  return {...meta,lesson:{title,assignment,initialNodeId,nodes,people:people.map(({id,name,role,nodeId,activity,goal,greeting,topics,appearance})=>({id,name,role,nodeId,activity,goal,greeting,topics,appearance})),materials,strategies,workPlan}};
});
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'catalog.json'),JSON.stringify(catalog));
await writeFile(resolve(output,'.nojekyll'),'');
await writeFile(resolve(output,'favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#111315"/><path d="M8 25 18 10h12l-8 12h-8l-4 7h12l13-19h6L25 36H13Z" fill="#d0ae6b"/></svg>');
const html=await readFile(resolve(output,'index.html'),'utf8');
if(/127\.0\.0\.1|localhost|\/src\//u.test(html))throw new Error('Development-only reference in public entry');
console.log(JSON.stringify({output,courses:catalog.length,regions:new Set(catalog.map(course=>course.regionId)).size,scenesByRegion:Object.fromEntries(catalog.map(course=>[course.regionId,course.lesson.nodes.length]))}));
