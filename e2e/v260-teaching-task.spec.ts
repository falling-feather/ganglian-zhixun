import { expect, test, type Page } from "@playwright/test";
import {openArchiveDossier} from './fixtures/archive-flow';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("教师审阅发布后，两名学生从页面进入独立任务并可返回原场", async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  const watch = (target: Page) => {
    target.on("pageerror", error => errors.push(error.message));
    target.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  };
  watch(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/teacher/courses?profileId=teacher-class-a&sessionId=demo-xunpu-v2");
  await page.getByText('岗位委托转为教学任务 · 任务设计与发布',{exact:true}).click();
  await expect(page.getByRole("heading", { name: "把岗位委托转成学习任务" })).toBeVisible();
  await page.getByRole("button", { name: "使用人物报道示例" }).click();
  const title = `V2.6 人物报道课堂 ${Date.now()}`;
  await page.getByLabel("任务名称", { exact: true }).fill(title);
  await page.getByRole("button", { name: "生成任务草案", exact: true }).click();
  await expect(page.getByLabel("当前任务名称", { exact: true })).toHaveValue(title);
  await page.getByLabel("当前任务名称", { exact: true }).fill(`${title}（已审阅）`);
  await expect(page.getByRole("button", { name: "确认发布给本班" })).toBeDisabled();
  await page.getByRole("button", { name: "保存草案修改" }).click();
  await expect(page.getByText("草案 R2 · 当前修改已保存", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "我已核对任务、依据与本班条件，确认用于当前仿真实训。" }).check();
  await page.getByRole("button", { name: "确认发布给本班" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已发布 R2" })).toBeVisible();
  await page.reload();
  await page.getByText('岗位委托转为教学任务 · 任务设计与发布',{exact:true}).click();
  const savedDraft = page.locator(".teaching-saved .teaching-task-cards > article")
    .filter({ has: page.getByRole("heading", { name: `${title}（已审阅）`, exact: true }) })
    .filter({ has: page.getByRole("button", { name: "打开草案", exact: true }) });
  await savedDraft.getByRole("button", { name: "打开草案" }).click();
  await expect(page.getByLabel("任务名称", { exact: true })).toHaveValue(title);
  await expect(page.getByLabel("当前任务名称", { exact: true })).toHaveValue(`${title}（已审阅）`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("teacher-task-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("teacher-task-mobile.png"), fullPage: false });

  const sessions: string[] = [];
  for (const profile of ["student-unassigned", "student-team-a"]) {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const student = await context.newPage(); watch(student);
      await student.goto(`/student/courses?profileId=${profile}`);
      await openArchiveDossier(student,`${title}（已审阅）`);
      await expect(student).toHaveURL(/\/student\/training\/task-session-/);
      await expect(student.locator("body")).toContainText(`${title}（已审阅）`);
      const target = student.url();
      sessions.push(new URL(target).pathname);
      await student.reload();
      await expect(student.locator("body")).toContainText(`${title}（已审阅）`);
      await noOverflow(student);
      await student.screenshot({ path: testInfo.outputPath(`${profile}-world.png`), fullPage: false });
      await student.goto(`/student/courses?profileId=${profile}`);
      await openArchiveDossier(student,`${title}（已审阅）`);
      await expect(student).toHaveURL(target);
    } finally { await context.close(); }
  }
  expect(new Set(sessions).size).toBe(2);
  expect(errors).toEqual([]);
});
