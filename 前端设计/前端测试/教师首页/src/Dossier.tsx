import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,FileText,X} from 'lucide-react';
import type {StudentDossier} from './data';
import type {FolderAnchor} from './renderer';

export function Dossier({student,origin,reduced,onClose}:{student:StudentDossier;origin:FolderAnchor|null;reduced:boolean;onClose():void}) {
  const dialog=useRef<HTMLDialogElement>(null),animation=useRef<Animation|null>(null);
  const from=useRef('translate3d(-180px,0,0) scale(.45) rotateY(-24deg)');
  const [closing,setClosing]=useState(false);
  useEffect(()=>{
    const element=dialog.current!,previous=document.activeElement as HTMLElement|null;
    element.showModal();
    const bounds=element.getBoundingClientRect();
    if(origin){
      const x=origin.x-(bounds.left+bounds.width/2),y=Math.max(-55,Math.min(55,origin.y-(bounds.top+bounds.height/2)));
      from.current='translate3d('+x+'px,'+y+'px,0) scale('+Math.max(.2,origin.width/bounds.width)+','+Math.max(.3,origin.height/bounds.height)+') rotateY(-24deg)';
    }
    animation.current=element.animate([{transform:from.current,opacity:.65},{transform:'none',opacity:1}],{
      duration:reduced?0:650,easing:'cubic-bezier(.2,.75,.15,1)',
    });
    return()=>{animation.current?.cancel();element.close();previous?.focus({preventScroll:true});};
  },[]);
  const close=()=>{
    if(closing)return;setClosing(true);
    const element=dialog.current!;
    animation.current?.cancel();
    animation.current=element.animate([{transform:'none',opacity:1},{transform:from.current,opacity:0}],{
      duration:reduced?0:420,easing:'cubic-bezier(.35,0,.65,1)',fill:'forwards',
    });
    animation.current.onfinish=onClose;
  };
  return <dialog ref={dialog} className="dossier" aria-label={student.name+'详细档案'} onCancel={event=>{event.preventDefault();close();}}>
    <div className="dossier-spine" aria-hidden="true"/><div className="dossier-pages" aria-hidden="true"/>
    <article className="dossier-paper"><header><span>学生档案</span><button type="button" onClick={close} disabled={closing} aria-label="收回档案"><span>收回档案</span><X size={18}/></button></header>
      <div className="dossier-scroll"><div className="dossier-name"><span className="dossier-tab">{String(student.id+1).padStart(2,'0')}</span><h2>{student.name}</h2><p>{student.className} · 示例资料</p></div>
        <section><span className="section-label">当前课程</span><h3>{student.course}</h3><p>{student.region} · {student.status}</p></section>
        <section><span className="section-label">已交作品</span><div className="work-example"><FileText size={24}/><div><strong>{student.submitted?'选题工单 · R1':'尚未提交作品'}</strong><p>{student.submitted?'等待教师审阅':'完成实训后，作品会归入学生档案。'}</p></div>{student.submitted?<ArrowUpRight size={20}/>:null}</div></section>
        <section><span className="section-label">职业行为画像</span><div className="assessment-example"><span>—</span><p>待形成评价</p></div><p className="quiet">以交付作品为主，结合交流与岗位行动理解学习过程。</p></section>
        <section><span className="section-label">课程记录</span><p>当前只展示首页交互与示例档案。</p></section>
      </div>
      <footer><button type="button" onClick={close} disabled={closing}><ArrowLeft size={17}/>收回档案，继续查看学生</button></footer>
    </article>
  </dialog>;
}
