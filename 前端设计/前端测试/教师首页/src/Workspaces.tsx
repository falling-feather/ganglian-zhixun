import {useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,BookOpen,Check,FileText,GitBranch,ImagePlus,Plus,Save,Search,Send,UploadCloud,UserRound,X} from 'lucide-react';
import {classrooms,type Classroom} from './data';
import './workspaces.css';

type Page='archive'|'director'|'materials';
type NodeId='understand'|'knowledge'|'memory'|'decide'|'action'|'reply';
const workflow:readonly {id:NodeId;title:string;hint:string;required:boolean}[]=[
  {id:'understand',title:'理解来意',hint:'区分提问、商量和明确行动请求。',required:true},
  {id:'knowledge',title:'检索知识',hint:'只查阅人物被授予的课程资料。',required:false},
  {id:'memory',title:'回顾记忆',hint:'承接已发生的有效交流和关系。',required:false},
  {id:'decide',title:'判断意愿',hint:'结合人物目标和边界作出回应。',required:true},
  {id:'action',title:'执行行动',hint:'在课程允许范围内执行行动。',required:false},
  {id:'reply',title:'组织回应',hint:'用符合人设的表达回答学生。',required:true},
];
interface CharacterDraft {id:string;name:string;role:string;scene:string;persona:string;knowledge:string;contact:boolean;refusal:string;art:string|null;artRights:string;notes:Record<NodeId,string>;enabled:Record<NodeId,boolean>}
const initialCharacter=(id:string,name='资料联络员'):CharacterDraft=>({
  id,name,role:'社区资料整理与联络工作人员',scene:'资料联络点',persona:'表达清楚、耐心；只回答自己了解的事情，对不确定的信息明确说明。',
  knowledge:'课堂采访方法与资料使用说明',contact:true,refusal:'目前不方便继续联络，可以先在现场交流。',art:null,artRights:'',
  notes:Object.fromEntries(workflow.map(node=>[node.id,node.hint])) as Record<NodeId,string>,
  enabled:Object.fromEntries(workflow.map(node=>[node.id,true])) as Record<NodeId,boolean>,
});
interface MaterialRow {id:string;classId:number;name:string;kind:string;status:string;note:string;modelAllowed:boolean;body:string}
const initialMaterials:MaterialRow[]=classrooms.flatMap(c=>[
  {id:c.id+'-method',classId:c.id,name:'采访方法与语境核验.pdf',kind:'教学示例',status:'示例片段',note:'仅供本课程课堂讨论。',modelAllowed:false,body:'界面样例：整理采访材料时，保留完整表达与前后语境；结合调查目的核实可公开的内容。'},
  {id:c.id+'-brief',classId:c.id,name:c.course+' · 任务说明.txt',kind:'教学示例',status:'示例片段',note:'教师编排的课堂任务示例。',modelAllowed:false,body:'界面样例：围绕当前课程组织资料、说明来源与使用边界。此处并未读取正式资料库。'},
]);

export default function TeacherWorkspaces({page,classId,onClass,onBack}:{page:Page;classId:number;onClass(id:number):void;onBack():void}){
  const classroom=classrooms.find(value=>value.id===classId)!;
  const [drafts,setDrafts]=useState<Record<number,CharacterDraft[]>>(()=>Object.fromEntries(classrooms.map(c=>[c.id,[initialCharacter('liaison-'+c.id)]])));
  const [saved,setSaved]=useState<Record<number,CharacterDraft[]>>({});
  const [revisions,setRevisions]=useState<Record<number,number>>({});
  const [selection,setSelection]=useState<Record<number,string>>({});
  const [nodeId,setNodeId]=useState<NodeId>('knowledge');
  const [tab,setTab]=useState<'persona'|'knowledge'|'relations'|'art'>('persona');
  const [notice,setNoticeState]=useState<{text:string;error:boolean}|null>(null);
  const notify=(text:string,error=false)=>setNoticeState(text?{text,error}:null);
  const [publication,setPublication]=useState(false);
  const people=drafts[classId]??[];
  const person=people.find(value=>value.id===selection[classId])??people[0];
  const node=workflow.find(value=>value.id===nodeId)!;
  const dirty=JSON.stringify(people)!==JSON.stringify(saved[classId]??[]);
  const updatePerson=(patch:Partial<CharacterDraft>)=>{
    if(!person)return;
    setDrafts(current=>({...current,[classId]:current[classId]!.map(value=>value.id===person.id?{...value,...patch}:value)}));notify('');
  };
  const chooseClass=(value:number)=>{onClass(value);notify('');setPublication(false);setFile(null);setRights('');setModelAllowed(false);setSearch('');if(uploadInput.current)uploadInput.current.value='';};
  const saveDraft=()=>{
    setSaved(current=>({...current,[classId]:structuredClone(people)}));
    setRevisions(current=>({...current,[classId]:(current[classId]??0)+1}));
    notify('配置已暂存，切换页面保留，刷新后重置；尚未发布给学生。');
  };
  const [materials,setMaterials]=useState(initialMaterials);
  const uploadInput=useRef<HTMLInputElement>(null);
  const [search,setSearch]=useState('');
  const [file,setFile]=useState<File|null>(null),[rights,setRights]=useState(''),[modelAllowed,setModelAllowed]=useState(false);
  const [selectedMaterial,setSelectedMaterial]=useState<string|null>(null);
  const visibleMaterials=useMemo(()=>materials.filter(item=>item.classId===classId&&item.name.toLowerCase().includes(search.trim().toLowerCase())),[materials,classId,search]);
  const material=materials.find(item=>item.id===selectedMaterial&&item.classId===classId)??visibleMaterials[0];
  const addMaterial=()=>{
    if(!file||!rights.trim())return;
    const next:MaterialRow={id:crypto.randomUUID(),classId,name:file.name,kind:'本地选择',status:'未上传',note:rights.trim(),modelAllowed,body:'当前样机只记录选中文件的名称和使用说明，不上传原件、不调用模型，也不伪造解析结果。'};
    setMaterials(current=>[next,...current]);setSelectedMaterial(next.id);setFile(null);setRights('');setModelAllowed(false);if(uploadInput.current)uploadInput.current.value='';
    notify('已加入本地资料预览，原件没有上传。');
  };
  const picker=(label='当前班级')=><label className="class-picker"><span>{label}</span><select value={classId} onChange={event=>chooseClass(Number(event.target.value))}>{classrooms.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
  return <section className="teacher-workspace" hidden={page==='archive'} aria-label={page==='director'?'课程导演工作台':'教学资料工作台'}>
    <button type="button" className="workspace-back" onClick={onBack}><ArrowLeft size={16}/>返回学生档案</button>
    <header className="workspace-heading"><div><h1>{page==='director'?'课程导演':'教学资料'}</h1><p>{classroom.name} · {classroom.course}</p></div><div className="workspace-heading-actions">{picker()}{page==='director'?<><button type="button" className="secondary-action" onClick={saveDraft} disabled={!person||!person.name.trim()||!dirty}><Save size={17}/>保存配置</button><button type="button" className="primary-action" disabled={!saved[classId]||dirty} onClick={()=>setPublication(true)}><Send size={17}/>查看发布预览</button></>:null}</div></header>
    <p className="workspace-scope">独立样机 · 草稿刷新后重置，不会向学生发布或上传资料。</p>
    {notice?<p className={'workspace-notice '+(notice.error?'is-error':'')} role={notice.error?'alert':'status'}>{notice.error?<AlertTriangle size={17}/>:<Check size={17}/>} {notice.text}</p>:null}
    {page==='director'?<div className="director-layout">
      <aside className="workspace-panel cast-panel"><header><h2>本课人物</h2><button type="button" aria-label="添加人物" onClick={()=>{const next=initialCharacter(crypto.randomUUID(),'新人物');setDrafts(current=>({...current,[classId]:[...people,next]}));setSelection(current=>({...current,[classId]:next.id}));notify('');}}><Plus size={19}/></button></header>
        <div className="cast-list">{people.map(value=><button type="button" key={value.id} className={value.id===person?.id?'selected':''} onClick={()=>setSelection(current=>({...current,[classId]:value.id}))}><span className="cast-avatar">{value.name.slice(0,1)}</span><span><strong>{value.name}</strong><small>{value.role}</small></span><ArrowRight size={15}/></button>)}</div>
        <div className="class-context"><BookOpen size={19}/><div><strong>{classroom.course}</strong><p>只在开课前配置人物；在学课程保持原版本。</p></div></div>
        <p className="saved-revision">{saved[classId]?'本地配置 R'+revisions[classId]:'尚未保存本地配置'}</p>
      </aside>
      <section className="workspace-panel flow-panel">{person?<><header><div><h2>{person.name}</h2><p>{person.role}</p></div></header>
        <div className="node-flow" aria-label="人物智能体流程">{workflow.map((item,index)=><button type="button" key={item.id} className={(item.id===nodeId?'selected ':'')+(!person.enabled[item.id]?'node-disabled':'')} onClick={()=>setNodeId(item.id)}><span>{String(index+1).padStart(2,'0')}</span><strong>{item.title}</strong><small>{person.enabled[item.id]?'已启用':'已停用'}</small></button>)}</div>
        <div className="node-properties"><header><h3><GitBranch size={18}/>{node.title}</h3>{node.required?<span>必要节点</span>:<label><input type="checkbox" checked={person.enabled[node.id]} onChange={event=>updatePerson({enabled:{...person.enabled,[node.id]:event.target.checked}})}/>启用此节点</label>}</header><p>{node.hint}</p><label>节点说明<textarea rows={5} value={person.notes[node.id]} onChange={event=>updatePerson({notes:{...person.notes,[node.id]:event.target.value}})}/></label></div>
      </>:<p>添加人物后，配置它的默认交互流程。</p>}</section>
      <aside className="workspace-panel properties-panel">{person?<><nav aria-label="人物属性">{(['persona','knowledge','relations','art'] as const).map(id=><button type="button" key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{({persona:'人设',knowledge:'知识',relations:'关系',art:'立绘'})[id]}</button>)}</nav>
        {tab==='persona'?<div className="workspace-fields"><label>名称<input value={person.name} maxLength={40} onChange={event=>updatePerson({name:event.target.value})}/></label><label>身份<input value={person.role} onChange={event=>updatePerson({role:event.target.value})}/></label><label>所在场景<input value={person.scene} onChange={event=>updatePerson({scene:event.target.value})}/></label><label>人设与表达习惯<textarea rows={6} value={person.persona} onChange={event=>updatePerson({persona:event.target.value})}/></label></div>:null}
        {tab==='knowledge'?<div className="workspace-fields"><h3>可使用的课程资料</h3><label>人物掌握的内容<textarea rows={9} value={person.knowledge} onChange={event=>updatePerson({knowledge:event.target.value})}/></label><p>仅为本地配置预览，尚未连接课程资料库。</p></div>:null}
        {tab==='relations'?<div className="workspace-fields"><label className="check-field"><input type="checkbox" checked={person.contact} onChange={event=>updatePerson({contact:event.target.checked})}/>愿意在条件满足后加好友</label><label>暂不愿意时如何回应<textarea rows={6} value={person.refusal} onChange={event=>updatePerson({refusal:event.target.value})}/></label><p>人物意愿与关系参数不直接作为学生分数。</p></div>:null}
        {tab==='art'?<div className="workspace-fields"><div className="portrait-preview">{person.art?<img src={person.art} alt={person.name+'立绘预览'}/>:<><UserRound size={54}/><span>人物立绘</span></>}</div><label>自有立绘使用说明<textarea rows={3} value={person.artRights} onChange={event=>updatePerson({artRights:event.target.value})}/></label><label className="portrait-upload"><ImagePlus size={18}/>选择透明PNG<input type="file" accept="image/png" onChange={event=>{const picture=event.target.files?.[0];event.target.value='';if(!picture)return;if(picture.type!=='image/png'||picture.size>2*1024*1024){notify('请选择不超过2MB的PNG图片。',true);return;}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string')updatePerson({art:reader.result});};reader.onerror=()=>notify('图片读取失败，请重新选择。',true);reader.readAsDataURL(picture);}}/></label><p>仅在当前浏览器预览，不上传图片。</p></div>:null}
      </>:null}</aside>
    </div>:null}
    {page==='materials'?<div className="materials-layout"><div>
      <section className="workspace-panel"><header><h2>导入教学资料</h2><UploadCloud size={22}/></header><div className="upload-fields"><label className="file-pick"><span>文件</span><input ref={uploadInput} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.mp3,.wav,.mp4" onChange={event=>setFile(event.target.files?.[0]??null)}/><small>{file?file.name:'支持PDF、文本、图片、音频和视频'}</small></label><label>来源与使用说明<textarea rows={3} value={rights} placeholder="说明资料来源、用途和使用范围" onChange={event=>setRights(event.target.value)}/></label></div><label className="check-field"><input type="checkbox" checked={modelAllowed} onChange={event=>setModelAllowed(event.target.checked)}/>允许本课程授权的模型上下文检索使用</label><button type="button" className="primary-action" disabled={!file||!rights.trim()} onClick={addMaterial}><Plus size={17}/>加入本地预览</button></section>
      <section className="workspace-panel"><header><h2>课程资料</h2><label className="material-search"><Search size={17}/><input aria-label="查询课程资料" value={search} onChange={event=>setSearch(event.target.value)} placeholder="搜索资料名称"/></label></header><div className="materials-table"><div className="materials-table-heading"><span>资料名称</span><span>状态</span><span>操作</span></div>{visibleMaterials.map(item=><div className={item.id===material?.id?'selected':''} key={item.id}><span><FileText size={19}/>{item.name}</span><span>{item.status}</span><button type="button" onClick={()=>setSelectedMaterial(item.id)}>预览<ArrowRight size={15}/></button></div>)}{!visibleMaterials.length?<p>没有匹配的资料。</p>:null}</div></section>
    </div><aside className="workspace-panel material-preview"><header><h2>来源与片段预览</h2><FileText size={21}/></header>{material?<><h3>{material.name}</h3><span className="material-kind">{material.kind}</span><div className="material-document">{material.body}</div><dl><div><dt>所属班级</dt><dd>{classroom.name}</dd></div><div><dt>使用说明</dt><dd>{material.note}</dd></div><div><dt>模型检索选项</dt><dd>{material.modelAllowed?'已勾选，仅本地记录':'未授权'}</dd></div></dl></>:<p>选择资料后查看预览。</p>}</aside></div>:null}
    {publication?<PublicationPreview classroom={classroom} people={saved[classId]??[]} onClose={()=>setPublication(false)}/>:null}
  </section>;
}

function PublicationPreview({classroom,people,onClose}:{classroom:Classroom;people:readonly CharacterDraft[];onClose():void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current!;element.showModal();return()=>element.close();},[]);
  return <dialog ref={dialog} className="workspace-modal" aria-label="发布范围预览" onCancel={event=>{event.preventDefault();onClose();}}><header><h2>发布范围预览</h2><button type="button" onClick={onClose} aria-label="关闭发布预览"><X size={19}/></button></header><p>{classroom.name} · {classroom.course}</p><ul>{people.map(value=><li key={value.id}>{value.name} · {value.role}</li>)}</ul><p>正式接入后，配置用于新开课程。此处只预览，不会发布到学生端。</p><button type="button" className="primary-action" onClick={onClose}>返回课程导演</button></dialog>;
}
