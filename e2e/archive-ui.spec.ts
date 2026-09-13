import {expect,test} from '@playwright/test';
import {revealArchiveDetails} from './fixtures/archive-flow';
// Continuous GPU readback changes animation timing on software renderers.
// Keep DOM/action traces and explicit state screenshots for this animation test.
test.use({video:'off',trace:{mode:'retain-on-failure',screenshots:false,snapshots:true}});

test('黑色档案：局部暂停、详情不提前开课、收回与窄屏目录',async({page},info)=>{
  test.setTimeout(120000);
  const errors:string[]=[],starts:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/v3/me/study/start'))starts.push(request.url());});
  await page.setViewportSize({width:1672,height:941});
  await page.goto('/student/courses?profileId=student-unassigned');
  const stage=page.locator('.v3-archive'),canvas=page.locator('.archive-field-canvas');
  await expect(stage).toHaveAttribute('data-ready','true',{timeout:30000});
  await expect(canvas).toHaveAttribute('data-total-sheets','441');
  await expect(page.locator('.archive-render-message')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('archive-idle.png')});
  // The wave moves the gaps as well as the folders. Find a visible physical
  // folder rather than assuming one fixed pixel can never fall in a gap.
  let hit={x:1030,y:550};
  for(const point of [{x:1030,y:550},{x:970,y:480},{x:900,y:410}]){
    hit=point;await page.mouse.move(point.x,point.y);
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    if(await page.locator('.archive-preview').isVisible())break;
  }
  await expect(page.locator('.archive-preview')).toBeVisible();
  await expect.poll(()=>canvas.getAttribute('data-focus-phase')).not.toBe('');
  const firstFrame=Number(await canvas.getAttribute('data-frame'));
  await expect.poll(async()=>Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(firstFrame+24);
  const held=await canvas.getAttribute('data-focus-phase'),far=await canvas.getAttribute('data-distant-phase'),frame=Number(await canvas.getAttribute('data-frame'));
  await expect.poll(async()=>Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(frame+24);
  expect(await canvas.getAttribute('data-focus-phase')).toBe(held);
  expect(await canvas.getAttribute('data-distant-phase')).not.toBe(far);
  await page.screenshot({path:info.outputPath('archive-hover.png')});
  await page.mouse.click(hit.x,hit.y);
  await expect(page.locator('.archive-reader')).toHaveAttribute('data-settled','true');
  expect(starts).toEqual([]);
  await page.screenshot({path:info.outputPath('archive-details.png')});
  await page.getByRole('button',{name:'收回档案',exact:true}).click();
  await expect(page.locator('.archive-reader')).toHaveCount(0);
  await expect(stage).toHaveAttribute('data-state','idle');
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  const reader=await revealArchiveDetails(page,'社区深度采访');
  await expect(reader.getByRole('heading',{name:'社区深度采访',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:info.outputPath('archive-mobile.png')});
  await page.keyboard.press('Escape');await expect(reader).toHaveCount(0);
  expect(starts).toEqual([]);expect(errors).toEqual([]);
});
