import {
  archiveSheetPose, createArchiveSheets,
  FILE_HEIGHT, FILE_WIDTH, type ArchiveSheet,
} from '../../../../apps/web/src/v2/pages/archive-field/motion';

export {FILE_HEIGHT,FILE_WIDTH};
export {advanceArchiveFlow as advanceTeacherFlow,resizeArchiveLoop} from '../../../../apps/web/src/v2/pages/archive-field/motion';
export const FILE_PITCH=1.25;
export const TEACHER_ROWS=4;
export const CLASS_LANE_GAP=7.4;

/** Whole lanes retain the production solver's slot topology and collision rules. */
export function createTeacherSheets(): ArchiveSheet[] {
  const sheets=createArchiveSheets().filter(sheet=>sheet.row<TEACHER_ROWS);
  for(let row=0;row<TEACHER_ROWS;row++) {
    const lane=sheets.filter(sheet=>sheet.row===row);
    const loop={start:-36-row*8.5,length:lane.length*FILE_PITCH};
    for(const sheet of lane) {
      sheet.x=row*CLASS_LANE_GAP;sheet.z=loop.start+(sheet.slot+.5)*FILE_PITCH;
      sheet.direction=1;sheet.group=row*lane.length+sheet.slot;sheet.loop=loop;
    }
  }
  return sheets;
}

export function teacherPose(sheet:ArchiveSheet,spread=0) {
  const pose=archiveSheetPose(sheet);
  return {x:sheet.x*(1+spread*.10),y:FILE_HEIGHT/2,z:pose.z*(1+spread*.10)};
}

/** Search repositions the same records; it never swaps a name onto a different folder. */
export function positionTeacherSheet(sheets:ArchiveSheet[],index:number,targetZ=10) {
  const selected=sheets[index];if(!selected)return;
  const shift=targetZ-teacherPose(selected).z;
  for(const sheet of sheets)if(sheet.row===selected.row)sheet.phase+=shift;
  selected.speed=0;
}
