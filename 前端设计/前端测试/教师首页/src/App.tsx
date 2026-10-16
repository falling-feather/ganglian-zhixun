import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown,LoaderCircle,Mouse,Search,Settings2,SlidersHorizontal,UsersRound,X} from 'lucide-react';
import {BrandMark} from '../../../../apps/web/src/v2/brand-mark';
import {classrooms,students} from './data';
import {Dossier} from './Dossier';
import type {ClassVisualState,FolderAnchor,TeacherArchiveRenderer} from './renderer';

type TeacherPage='archive'|'director'|'materials';
const Workspaces=lazy(()=>import('./Workspaces'));
const route=():TeacherPage=>location.hash==='#director'?'director':location.hash==='#materials'?'materials':'archive';
const phaseCopy={idle:'',opening:'前排让开',forward:'班级前置',settling:'档案归位'};

export function App(){
  const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<TeacherArchiveRenderer|null>(null);
  const path=useRef<SVGPathElement>(null),preview=useRef<HTMLElement>(null),leaveTimer=useRef<number|null>(null);
  const pendingStudent=useRef<{id:number;open:boolean}|null>(null);
  const [page,setPage]=useState<TeacherPage>(route);
  const [workspaceOpened,setWorkspaceOpened]=useState(()=>route()!=='archive');
  const [classId,setClassId]=useState(0);
  const [classState,setClassState]=useState<ClassVisualState>({front:0,target:0,moving:0,phase:'idle',busy:false});
  const [hovered,setHovered]=useState<number|null>(null);
  const [selected,setSelected]=useState<{id:number;origin:FolderAnchor|null}|null>(null);
  const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(false),[settings,setSettings]=useState(false);
  const [ready,setReady]=useState(false),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const preferences=useRef({reduced,expanded,page,classId});preferences.current={reduced,expanded,page,classId};
  const classroom=classrooms[classId]!;
  const classStatus=classState.busy?phaseCopy[classState.phase]+' · '+classrooms[classState.moving]!.shortName+(classState.target!==classState.moving?'；随后查找'+classrooms[classState.target]!.shortName:''):'前排 · '+classroom.name;
  const active=hovered===null?null:students[hovered]!;
  const matches=useMemo(()=>{
    const term=query.trim().replace(/\s+/g,'');
    return students.filter(student=>student.classId===classId&&(!term||student.name.includes(term)||String(student.id+1)===term));
  },[query,classId]);
  const cancelLeave=()=>{if(leaveTimer.current!==null)clearTimeout(leaveTimer.current);leaveTimer.current=null;};
  const leave=()=>{if(leaveTimer.current===null)leaveTimer.current=window.setTimeout(()=>{engine.current?.clearPointer();leaveTimer.current=null;},400);};
  const finishStudent=(id:number,open:boolean)=>{
    const origin=engine.current?.focusStudent(id)??null;setHovered(id);
    if(open){engine.current?.setExtracted(true);setSelected({id,origin});}
  };
  useEffect(()=>{
    const onHash=()=>{const next=route();pendingStudent.current=null;engine.current?.setExtracted(false);engine.current?.clearPointer();setSelected(null);setHovered(null);setQuery('');setExpanded(false);setSettings(false);setPage(next);if(next!=='archive')setWorkspaceOpened(true);};
    window.addEventListener('hashchange',onHash);
    return()=>window.removeEventListener('hashchange',onHash);
  },[]);
  useEffect(()=>{
    document.title='岗链智训 · '+({archive:'教师档案首页',director:'课程导演',materials:'教学资料'})[page]+'样机';
    engine.current?.setActive(page==='archive');
  },[page]);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const controller=new AbortController();let owned:TeacherArchiveRenderer|null=null;
    setReady(false);setError(null);
    void import('./renderer').then(module=>module.TeacherArchiveRenderer.create(canvas.current!,students,{
      hover:setHovered,
      anchor(value){
        if(!value||!path.current||!preview.current)return;
        const bounds=preview.current.getBoundingClientRect(),scene=canvas.current!.getBoundingClientRect();
        const startX=bounds.right-scene.left+14,startY=bounds.top-scene.top+36;
        path.current.setAttribute('d','M'+startX+','+startY+' L'+(startX+26)+','+(startY-20)+' L'+value.tabX+','+value.tabY);
      },
      failure(message){setError(message);setExpanded(true);},
      classProgress:setClassState,
      classSettled(id){
        setClassId(id);
        const pending=pendingStudent.current;
        if(pending&&students[pending.id]?.classId===id){pendingStudent.current=null;finishStudent(pending.id,pending.open);}
      },
    },controller.signal)).then(value=>{
      if(controller.signal.aborted){value.dispose();return;}
      owned=value;engine.current=value;
      value.setReducedMotion(preferences.current.reduced);value.setExpanded(preferences.current.expanded);
      value.setActive(preferences.current.page==='archive');value.requestClass(preferences.current.classId,true);
      setReady(true);
    }).catch(cause=>{
      if(!controller.signal.aborted){setError(cause instanceof Error?cause.message:'档案画面未能载入');setExpanded(true);}
    });
    return()=>{controller.abort();owned?.dispose();if(engine.current===owned)engine.current=null;cancelLeave();};
  },[attempt]);
  useEffect(()=>{engine.current?.setReducedMotion(reduced);},[reduced]);
  useEffect(()=>{engine.current?.setExpanded(expanded);},[expanded]);
  const navigate=(next:TeacherPage)=>{
    cancelLeave();pendingStudent.current=null;engine.current?.clearPointer();setExpanded(false);setQuery('');setSettings(false);
    if(next!=='archive')setWorkspaceOpened(true);setPage(next);location.hash=next==='archive'?'':next;
  };
  const chooseClass=(id:number)=>{
    cancelLeave();pendingStudent.current=null;setHovered(null);setQuery('');setExpanded(false);
    if(engine.current)engine.current.requestClass(id,page!=='archive');
    else {setClassId(id);setClassState({front:id,target:id,moving:id,phase:'idle',busy:false});}
  };
  const chooseStudent=(id:number,open=false)=>{
    cancelLeave();setQuery('');
    const student=students[id]!;
    if(!engine.current||(!engine.current.classState.busy&&engine.current.classState.front===student.classId)){finishStudent(id,open);return;}
    pendingStudent.current={id,open};setHovered(null);setExpanded(false);engine.current.requestClass(student.classId);
  };
  const closeStudent=()=>{engine.current?.setExtracted(false);engine.current?.clearPointer();setSelected(null);};

  return <main className={'teacher-home '+(expanded?'expanded ':'')+(page!=='archive'?'workbench-open':'')} data-page={page} data-ready={ready?'true':'false'} data-state={selected?'detail':hovered!==null?'hover':'idle'} data-front-class={classId} data-class-phase={classState.phase}>
    {page==='archive'?<h1 className="sr-only">教师学生档案</h1>:null}
    <canvas ref={canvas} className="archive-canvas" aria-hidden="true"
      onPointerMove={event=>{
        if(selected||classState.busy||event.pointerType==='touch')return;
        const box=event.currentTarget.getBoundingClientRect(),id=engine.current?.pointerAt(event.clientX-box.left,event.clientY-box.top);
        if(id===null||id===undefined)leave();else cancelLeave();
      }}
      onPointerLeave={event=>{if(!(event.relatedTarget instanceof Element&&event.relatedTarget.closest('.student-preview,.directory')))leave();}}
      onClick={event=>{
        if(classState.busy)return;
        const box=event.currentTarget.getBoundingClientRect(),id=engine.current?.pointerAt(event.clientX-box.left,event.clientY-box.top);
        if(id!==null&&id!==undefined){if(event.nativeEvent instanceof PointerEvent&&event.nativeEvent.pointerType==='touch'&&hovered!==id)chooseStudent(id);else chooseStudent(id,true);}
        else engine.current?.clearPointer();
      }}/>
    <header className="topbar">
      <button type="button" className="brand" onClick={()=>navigate('archive')} aria-label="岗链智训教师首页"><BrandMark/><span>岗链智训</span></button>
      {page==='archive'?<form className="search" onSubmit={event=>{event.preventDefault();const exact=matches.find(item=>item.name===query.trim())??matches[0];if(exact)chooseStudent(exact.id);}}>
        <Search size={19}/><input type="search" aria-label="搜索学生姓名" placeholder={classroom.shortName+' · 搜索学生姓名'} value={query} autoComplete="off" disabled={classState.busy}
          onChange={event=>setQuery(event.target.value)} onFocus={()=>engine.current?.clearPointer()} onKeyDown={event=>{if(event.key==='Escape')setQuery('');}}/>
        {query?<button type="button" onClick={()=>setQuery('')} aria-label="清除搜索"><X size={15}/></button>:null}
        {query.trim()?<div className="search-results" aria-label="搜索结果">{matches.length?matches.slice(0,8).map(student=><button type="button" key={student.id} onClick={()=>chooseStudent(student.id)}><strong>{student.name}</strong><span>{student.className}</span><ArrowUpRight size={16}/></button>):<p>本班没有找到对应学生</p>}</div>:null}
      </form>:null}
      <nav className="navigation" aria-label="教师页面">{([['archive','学生档案'],['director','课程导演'],['materials','教学资料']] as const).map(([id,label])=><button type="button" key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}>{label}</button>)}</nav>
      <div className="account"><span>教师<ChevronDown size={15}/></span><button type="button" aria-label="体验设置" aria-expanded={settings} onClick={()=>{engine.current?.clearPointer();setSettings(value=>!value);}}><Settings2 size={23}/></button></div>
    </header>
    {settings?<section className="settings-panel" aria-label="体验设置"><header><h2>体验设置</h2><button type="button" onClick={()=>setSettings(false)} aria-label="关闭设置"><X size={17}/></button></header><label><span><strong>减少动态效果</strong><small>班级直接定位，保留全部查看操作</small></span><input type="checkbox" checked={reduced} onChange={event=>setReduced(event.target.checked)}/></label><p>独立教师端样机，使用示例班级与学生。</p></section>:null}
    {page==='archive'?<>
      <section className="class-toolbar" aria-label="按班级查找档案"><span className="class-toolbar-label"><UsersRound size={17}/>班级</span><div className="class-buttons">{classrooms.map(c=><button type="button" key={c.id} aria-label={'选择'+c.name} aria-pressed={classId===c.id} className={(classId===c.id?'selected ':'')+(classState.busy&&classState.target===c.id?'pending':'')} onClick={()=>chooseClass(c.id)}><span className="class-long-name">{c.name}</span><span className="class-short-name">{c.shortName}</span>{classState.busy&&classState.target===c.id?<LoaderCircle size={14} className="spin"/>:null}</button>)}</div><span className="class-progress" role="status">{classStatus}</span></section>
      {!ready&&!error?<p className="loading" role="status"><LoaderCircle className="spin" size={18}/>正在展开档案</p>:null}
      {error?<aside className="error" role="alert"><p>{error}</p><button type="button" onClick={()=>setAttempt(value=>value+1)}>重新载入画面</button></aside>:null}
      {active&&!selected&&!expanded&&!classState.busy?<><aside ref={preview} className="student-preview" aria-label={active.name+'预览'} onPointerEnter={cancelLeave} onPointerLeave={leave}>
        <span className="preview-index">{active.className} / 学生档案</span><h2>{active.name}</h2><p className="preview-course">{active.course}</p><p className="preview-status"><span/>{active.status}</p><p className="preview-note">查看课程、已交作品与学习记录。</p>
        <button type="button" onClick={()=>chooseStudent(active.id,true)}>点击抽出档案<ArrowUpRight size={20}/></button>
      </aside><svg className="connector" aria-hidden="true"><path ref={path}/></svg></>:null}
      {expanded?<section className="directory" aria-label="学生档案目录" onPointerEnter={cancelLeave}><header><h2>{classroom.name}</h2><button type="button" onClick={()=>setExpanded(false)} aria-label="收拢档案目录"><X size={18}/></button></header><p>选择姓名，抽出对应档案。</p><div>{matches.map(student=><button type="button" key={student.id} aria-label={'查看'+student.name+'档案'} onFocus={()=>engine.current?.focusStudent(student.id)} onPointerEnter={()=>engine.current?.focusStudent(student.id)} onClick={()=>chooseStudent(student.id,true)}><span>{student.name}</span><ArrowUpRight size={16}/></button>)}</div></section>:null}
      <footer className="footer"><span className="guide"><Mouse size={22}/><span>选择班级查找档案<span className="guide-separator"> · </span><span className="guide-action">点击学生查看详情</span></span></span><span className="prototype-caption">独立样机 · 示例班级</span><button type="button" className="expand-button" aria-pressed={expanded} disabled={classState.busy} onClick={()=>{setExpanded(value=>!value);engine.current?.clearPointer();}}>{expanded?<SlidersHorizontal size={17}/>:null}{expanded?'收拢档案':'展开档案'}<ArrowUpRight size={17}/></button></footer>
    </>:null}
    {workspaceOpened?<Suspense fallback={page!=='archive'?<p className="loading" role="status">正在打开工作台…</p>:null}><Workspaces page={page} classId={classId} onClass={chooseClass} onBack={()=>navigate('archive')}/></Suspense>:null}
    {selected?<Dossier key={selected.id} student={students[selected.id]!} origin={selected.origin} reduced={reduced} onClose={closeStudent}/>:null}
  </main>;
}
