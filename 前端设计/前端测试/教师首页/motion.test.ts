import {describe,expect,it} from 'vitest';
import {advanceTeacherFlow,createTeacherSheets,FILE_PITCH,positionTeacherSheet,teacherPose} from './src/motion';

describe('teacher multi-lane adapter',()=>{
  it('settles the selected student, queues followers without overlap and keeps other lanes moving',()=>{
    const sheets=createTeacherSheets(),focus=34,remote=97;
    for(let frame=0;frame<90;frame++)advanceTeacherFlow(sheets,1/30,focus,false);
    const held=sheets[focus]!.phase,far=sheets[remote]!.phase;
    for(let frame=0;frame<900;frame++)advanceTeacherFlow(sheets,1/30,focus,false);
    expect(sheets[focus]!.phase).toBe(held);
    expect(sheets[remote]!.phase-far).toBeGreaterThan(10);
    const lane=sheets.filter(sheet=>sheet.row===0).map(sheet=>teacherPose(sheet).z).sort((a,b)=>a-b);
    for(let index=1;index<lane.length;index++)expect(lane[index]!-lane[index-1]!).toBeGreaterThan(.17);
    for(let frame=0;frame<90;frame++)advanceTeacherFlow(sheets,1/30,null,false);
    expect(sheets[focus]!.phase).toBeGreaterThan(held+.5);
  });
  it('locates an offscreen record without changing names or circular spacing',()=>{
    const sheets=createTeacherSheets(),groups=sheets.map(sheet=>sheet.group);
    positionTeacherSheet(sheets,151,10);
    expect(teacherPose(sheets[151]!).z).toBeCloseTo(10);
    expect(sheets.map(sheet=>sheet.group)).toEqual(groups);
    expect(sheets.filter(sheet=>sheet.row!==2).every(sheet=>sheet.phase===0)).toBe(true);
    const positions=sheets.filter(sheet=>sheet.row===2).map(sheet=>teacherPose(sheet).z).sort((a,b)=>a-b);
    for(let index=1;index<positions.length;index++)expect(positions[index]!-positions[index-1]!).toBeCloseTo(FILE_PITCH);
  });
  it('does not advance or change student identity in reduced motion',()=>{
    const sheets=createTeacherSheets(),before=sheets.map(sheet=>teacherPose(sheet));
    for(let frame=0;frame<90;frame++)advanceTeacherFlow(sheets,1/30,5,true);
    expect(sheets.map(sheet=>teacherPose(sheet))).toEqual(before);
    expect(new Set(sheets.map(sheet=>sheet.group)).size).toBe(sheets.length);
  });
});
