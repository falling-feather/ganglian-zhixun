import { expect, test } from '@playwright/test';
import {openArchiveDossier,revealArchiveDetails} from './fixtures/archive-flow';

test('V2.8 档案点击、三地区探索、课前人物发布与在学版本隔离', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:960});
  const home=async()=>{await page.goto('/student/courses?profileId=student-unassigned');await expect.poll(()=>page.locator('.v3-dossier').count()).toBeGreaterThanOrEqual(5);};
  const open=async(index:number)=>{
    await home();
    const title=['社区深度采访','赛事采编','发布与回应','素材与版权','暴雨服务报道'][index]!;
    await openArchiveDossier(page,title);
  };
  await home();
  if(await page.getByRole('button',{name:'管理当前课程'}).isVisible()){
    await page.getByRole('button',{name:'管理当前课程'}).click();await page.getByRole('button',{name:'放弃本次课程',exact:true}).click();await page.getByRole('button',{name:'确认放弃本次课程',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await open(1);
  await expect(page.getByRole('button',{name:'与罗晓禾交谈'})).toBeVisible();
  const firstRun=page.url();
  await page.getByRole('button',{name:'手机',exact:true}).click();await expect(page.getByRole('dialog')).not.toContainText('韦承安');await page.getByRole('button',{name:'关闭工作手机'}).click();
  await page.getByRole('button',{name:'打开探索地图'}).click();await expect(page.getByRole('dialog')).not.toContainText('编辑工作间');await page.getByRole('button',{name:/关闭.*探索地图/}).click();
  await page.getByRole('button',{name:'与罗晓禾交谈'}).click();
  for(const text of ['我是来做采访的学生。','可以加你的微信好友吗？']){
    await page.getByRole('textbox',{name:'对罗晓禾说'}).fill(text);await page.getByRole('button',{name:'发送这句话'}).click();await expect(page.getByRole('textbox',{name:'对罗晓禾说'})).toBeEnabled();await expect(page.getByRole('textbox',{name:'对罗晓禾说'})).toHaveValue('');
  }
  await expect(page.locator('.interview-transcript')).toContainText(/工作(?:联络|联系)方式/);await page.getByRole('button',{name:'收起交谈'}).click();
  await page.getByRole('button',{name:'打开采访本'}).click();await page.getByRole('button',{name:'新建一页',exact:true}).click();await page.getByRole('textbox',{name:'笔记标题'}).fill('赛事采访的私人观察');await page.getByRole('textbox',{name:'笔记正文'}).fill('记录计划与已确认到场的区别，不把计划表当成最终事实。');await page.getByRole('button',{name:'收起采访本'}).click();await expect(page.locator('.v3-notebook')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('rongjiang.png')});
  const teacher=await browser.newPage({baseURL:new URL(firstRun).origin,viewport:{width:1440,height:960}});teacher.on('pageerror',error=>errors.push(error.message));
  try{
    await teacher.goto('/teacher/courses?profileId=teacher-class-a');await teacher.getByLabel('本次配置的课程').selectOption('course-village-super-multiplatform');
    await teacher.getByRole('button',{name:'新增课程人物'}).click();const name=`试课联络员-${Date.now().toString().slice(-6)}`;
    await teacher.getByLabel('名称',{exact:true}).fill(name);await teacher.getByRole('button',{name:'保存配置',exact:true}).click();await expect(teacher.getByText('人物配置已保存，可以审阅并发布。')).toBeVisible();
    await teacher.getByRole('button',{name:'发布到新开课程'}).click();await expect(teacher.getByText('已发布。之后新开的课程将使用这份人物配置；正在进行的场次保持原版本。')).toBeVisible();
    await page.reload();await expect(page.getByRole('button',{name:'打开采访本'})).toBeVisible();await expect(page.getByRole('button',{name:`与${name}交谈`})).toHaveCount(0);
    await open(3);await expect(page.getByRole('button',{name:'与沈书宁交谈'})).toBeVisible();await page.screenshot({path:info.outputPath('qinglan.png')});
    await open(0);await expect(page.getByRole('button',{name:'与林师傅交谈'})).toBeVisible();await page.screenshot({path:info.outputPath('xunpu.png')});
    await open(1);await expect(page.getByRole('button',{name:`与${name}交谈`})).toBeVisible();expect(page.url()).not.toBe(firstRun);
    await teacher.goto('/teacher/classes?profileId=teacher-class-a');await revealArchiveDetails(teacher,/体验学生/);await teacher.locator('.archive-reader-enter').click();await expect(teacher.getByRole('heading',{name:'职业行为画像'})).toBeVisible();await teacher.screenshot({path:info.outputPath('student-dossier.png')});
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'打开采访本'}).click();await expect(page.getByRole('textbox',{name:'笔记正文'})).toHaveValue(/记录计划与已确认到场/);await page.screenshot({path:info.outputPath('private-note-mobile.png')});
    expect(errors).toEqual([]);
  }finally{await teacher.close();}
});
