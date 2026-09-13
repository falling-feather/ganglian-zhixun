import { expect, test, type Page } from "@playwright/test";
import {openArchiveDossier} from './fixtures/archive-flow';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("当前旗舰课从认领到真实现场问答、资料与三角色回读", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/student/courses?profileId=student-unassigned");
  const sessionId=await openArchiveDossier(page,'社区深度采访');
  await expect(page).toHaveURL(new RegExp(`/student/training/${sessionId}`));
  await expect(page.getByLabel("采访现场，拖动观察、滚轮缩放、点击人物交流")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "与林师傅交谈", exact: true }).click();
  await page.getByLabel("对林师傅说", { exact: true }).fill("林师傅您好");
  let sent = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith(`/api/v4/sessions/${sessionId}/interview/actions`));
  await page.getByRole("button", { name: "发送这句话", exact: true }).click();
  expect((await sent).status()).toBe(200);
  await expect(page.getByLabel("与林师傅的交流记录")).toContainText("林师傅您好");
  await page.getByLabel("对林师傅说", { exact: true }).fill("遇到不愿被记录的人，我该怎样说明用途并尊重她的决定？");
  sent = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith(`/api/v4/sessions/${sessionId}/interview/actions`));
  await page.getByRole("button", { name: "发送这句话", exact: true }).click();
  expect((await sent).status()).toBe(200);
  await expect(page.getByLabel("与林师傅的交流记录")).toContainText("不能替她答应");
  await page.getByRole("button", { name: '收起交谈' }).click();
  await page.getByRole("button", { name: "查看巷口公示栏", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("待核事项");
  await page.screenshot({ path: info.outputPath("current-interview-material.png"), fullPage: false });
  await page.goto(`/student/reviews/${sessionId}?profileId=student-unassigned`);
  await expect(page.getByRole("heading", { name: "完成并提交作品后查看评价" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本场过程与作品反馈" })).toBeVisible();
  await page.goto(`/teacher/director/${sessionId}?profileId=teacher-class-a&sessionId=${sessionId}`);
  await expect(page.getByRole("heading", { name: "开放采访过程", exact: true })).toBeVisible();
  await page.getByText("查看人物交谈与实际选择", { exact: true }).click();
  await expect(page.locator(".teacher-field-transcript")).toContainText("不能替她答应");
  await page.goto(`/admin/trace?profileId=operator-demo&sessionId=${sessionId}`);
  await expect(page.locator("body")).not.toContainText("正在确认演示身份");
  await expect(page.locator("body")).toContainText("林师傅");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  expect(errors).toEqual([]);
});
