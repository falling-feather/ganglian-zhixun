import {expect,type Page} from '@playwright/test';

export async function revealArchiveDetails(page:Page,title:string|RegExp){
 await expect(page.locator('.v3-archive')).toBeVisible();
 await expect.poll(()=>page.locator('.v3-dossier').count()).toBeGreaterThan(0);
 const filters=page.locator('.archive-filters'),collection=page.getByLabel('档案类型');
 if(await collection.count()){
  if(await filters.getAttribute('open')===null)await filters.locator('summary').click();
  await collection.selectOption('');
  await filters.locator('summary').click();
 }
 const expand=page.getByRole('button',{name:'展开档案',exact:true});
 if(await expand.count())await expand.click();
 const dossier=page.locator('.v3-dossier').filter({hasText:title}).first();
 await dossier.click();
 const reader=page.locator('.archive-reader');
 await expect(reader).toBeVisible();await expect(reader).toHaveAttribute('data-settled','true');
 return reader;
}

export async function openArchiveDossier(page:Page,title:string|RegExp){
 const reader=await revealArchiveDetails(page,title);
 await reader.locator('.archive-reader-enter').click();
 const conflict=page.getByRole('heading',{name:'还有一门课程未完成'}),ready=page.getByRole('button',{name:'打开采访本'});
 await expect.poll(async()=>await conflict.isVisible()||await ready.isVisible()).toBe(true);
 if(await conflict.isVisible()){
  await page.getByRole('button',{name:'放弃旧课程，开新课',exact:true}).click();
  await expect(page.getByRole('heading',{name:'确认放弃本次课程？'})).toBeVisible();
  await page.getByRole('button',{name:'确认放弃并开新课',exact:true}).click();
 }
 await expect(ready).toBeVisible();await expect(page.locator('.node-field-stage[data-transition="ready"]')).toBeVisible();
 return decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)!);
}
