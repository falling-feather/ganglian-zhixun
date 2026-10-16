import {createTeacherSheets,TEACHER_ROWS} from './motion';

export interface Classroom {id:number;name:string;shortName:string;course:string;region:string}
export const classrooms:readonly Classroom[]=[
  {id:0,name:'融媒体1班',shortName:'1班',course:'社区深度采访',region:'蟳埔社区'},
  {id:1,name:'融媒体2班',shortName:'2班',course:'赛事采编',region:'榕江赛事街区'},
  {id:2,name:'融媒体3班',shortName:'3班',course:'发布与回应',region:'榕江赛事街区'},
  {id:3,name:'融媒体4班',shortName:'4班',course:'素材与版权',region:'青岚景区'},
];
if(classrooms.length!==TEACHER_ROWS)throw new Error('班级与档案行配置不一致');

export interface StudentDossier {
  id:number;
  name:string;
  course:string;
  region:string;
  status:string;
  submitted:number;
  classId:number;
  className:string;
}

/** Local visual fixtures only. No identity, coursework or assessment API is contacted. */
export const students:readonly StudentDossier[]=createTeacherSheets().map((sheet)=>{
  const classroom=classrooms[sheet.row]!;
  return {id:sheet.group,name:'学生'+(sheet.group+1),course:classroom.course,region:classroom.region,classId:classroom.id,className:classroom.name,
    status:sheet.group%3===0?'等待教师审阅':'正在学习',submitted:sheet.group%4};
});
