import { courseContentReleases, courseContentSectionCount } from "../packages/course-content/dist/index.js";
import {V260FixtureActor} from './fixtures/v260-http';
import {
  expect,
  test,
  type Page,
  type Response,
} from "@playwright/test";

const migrationCourseId = "course-village-super-multiplatform";
const migrationSessionId = "demo-village-super-v2";

function watchRuntime(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.rootScrollWidth).toBeLessThanOrEqual(
    dimensions.rootClientWidth + 1,
  );
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(
    dimensions.bodyClientWidth + 1,
  );
}

function isMigrationCommand(response: Response): boolean {
  return response.request().method() === "POST"
    && response.url().includes(`/api/sessions/${migrationSessionId}/commands`);
}

async function performPrimaryTransition(page: Page): Promise<void> {
  const primary = page.locator(".v2-training-actions .primary");
  const previousLabel = (await primary.innerText()).trim();
  await expect(primary).toBeEnabled({ timeout: 30_000 });
  const responsePromise = page.waitForResponse(isMigrationCommand);
  await primary.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect.poll(async () => ({
    disabled: await primary.isDisabled(),
    label: (await primary.innerText()).trim(),
  }), {
    message: "权威回读必须关闭当前主行动或打开下一主行动",
    timeout: 30_000,
  }).not.toEqual({ disabled: false, label: previousLabel });
}

async function acceptCurrentAdvice(page: Page): Promise<void> {
  const accept = page.locator(".v2-advice-actions button.accept");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await expect(accept).toBeVisible({ timeout: 30_000 });
    await expect(accept).toBeEnabled();
    const responsePromise = page.waitForResponse(isMigrationCommand);
    await accept.click();
    const response = await responsePromise;
    expect([200, 409]).toContain(response.status());
    if (response.status() === 200) {
      await expect(page.locator(".v2-advice-settled")).toBeVisible({
        timeout: 30_000,
      });
      return;
    }
    await expect.poll(async () => (
      await page.locator(".v2-advice-settled").isVisible()
      || await accept.isEnabled()
    ), { timeout: 30_000 }).toBe(true);
    if (await page.locator(".v2-advice-settled").isVisible()) return;
  }
  throw new Error("建议决定在四次权威重读后仍未被服务端确认");
}

async function openPendingTeacherGate(page: Page): Promise<void> {
  const path = `/teacher/director/${migrationSessionId}`
    + `?profileId=teacher-class-a&sessionId=${migrationSessionId}`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.goto(path);
    const approve = page.locator(".v2-teacher-decision-actions button.approve");
    if (await approve.isVisible()) return;
    await page.waitForTimeout(500);
  }
  await expect(page.locator(".v2-teacher-decision-actions button.approve"))
    .toBeVisible();
}

async function approveTeacherGate(page: Page): Promise<void> {
  await page.locator(".v2-teacher-decision-actions button.approve").click();
  await page.locator(".v2-teacher-reason textarea").fill(
    "平台受众、指标口径与发布责任均已形成可追溯证据，同意进入下一节。",
  );
  const responsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().includes(`/api/sessions/${migrationSessionId}/teacher-gates/`)
    && response.url().endsWith("/decisions")
  ));
  await page.locator(".v2-teacher-reason button").click();
  expect((await responsePromise).status()).toBe(200);
  const recentOutcome = page.locator(".v2-recent-teacher-outcome");
  await expect(recentOutcome).toBeVisible({ timeout: 30_000 });
  await expect(recentOutcome).toContainText("教师门");
  await expect(recentOutcome).toContainText("已批准");
  await expect(recentOutcome).toContainText("世界后果");
  await expect(recentOutcome).toContainText("已发生权威写回");
}

test("V2 第二轮迁移课程真实一章与管理员消融诚实门", async ({ page }) => {
  test.setTimeout(240_000);
  const runtimeProblems = watchRuntime(page);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  const fixture=await new V260FixtureActor(process.env.E2E_API_ORIGIN??'http://127.0.0.1:3001').login('student-unassigned');
  const study=await fixture.request<import('../packages/contracts/src/index.js').StudentStudyV3>('GET','/api/v3/me/study');
  if(study.currentSessionId)await fixture.request('POST','/api/v3/me/study/cancel',{requestId:'legacy-setup-'+Date.now(),sessionId:study.currentSessionId,expectedRevision:study.revision,confirmation:'abandon'});

  await test.step("学生从真实课程详情认领村超 runtime.2", async () => {
    const requestOffset = requestedUrls.length;
    await page.goto(
      `/student/courses/${migrationCourseId}?profileId=student-unassigned`,
    );
    await expect(page.locator(".v2-course-detail")).toBeVisible();
    await expect(page.locator(".v2-course-chapter-list > li")).toHaveCount(6);
    await expect(page.locator(".v2-course-detail-action .v2-primary-cta"))
      .toContainText("认领课程");
    await expectNoHorizontalOverflow(page);

    const claimResponse = page.waitForResponse((response) => (
      response.request().method() === "POST"
      && response.url().endsWith("/api/course-enrollments")
    ));
    await page.locator(".v2-course-detail-action .v2-primary-cta").click();
    expect((await claimResponse).status()).toBe(200);
    await expect(page).toHaveURL(
      new RegExp(`/student/training/${migrationSessionId}`),
    );
    await expect(page.locator(".v2-training-page")).toBeVisible();
    await expect(page.locator(".v2-task-summary")).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText("STATE #");
    await expect(page.locator("body")).not.toContainText("Trace");
    const studentUrls = requestedUrls.slice(requestOffset);
    expect(studentUrls.some((url) => url.includes("/api/admin/"))).toBe(false);
    expect(studentUrls.some((url) => url.includes("/teacher-gates/"))).toBe(false);
  });

  await test.step("action1 到 action2 后才开放建议，选择后只有 X 可执行", async () => {
    await performPrimaryTransition(page);
    await performPrimaryTransition(page);
    await expect(page.locator(".v2-advice-actions button.accept")).toBeVisible({
      timeout: 30_000,
    });
    await acceptCurrentAdvice(page);
    const completionAction = page.locator(".v2-training-actions .primary");
    await expect(completionAction).toBeEnabled({ timeout: 30_000 });
    await expect(completionAction).toContainText("冻结平台地图版本");
    await performPrimaryTransition(page);
    await expect(completionAction).toBeDisabled();
    await expect(completionAction).toContainText("等待主行动开放");
  });

  await test.step("教师批准真实门后世界推进到村超第二章", async () => {
    const requestOffset = requestedUrls.length;
    await openPendingTeacherGate(page);
    await expect(page.locator(".v2-director-page")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("STATE #");
    await expect(page.locator("body")).not.toContainText("Trace");
    const teacherUrls = requestedUrls.slice(requestOffset);
    for (const forbidden of [
      "/api/me/course-enrollments",
      "/student-training-context",
      "/api/admin/",
    ]) {
      expect(teacherUrls.some((url) => url.includes(forbidden))).toBe(false);
    }
    await approveTeacherGate(page);
    await expectNoHorizontalOverflow(page);

    const contextResponse = page.waitForResponse((response) => (
      response.request().method() === "GET"
      && response.url().includes(
        `/api/sessions/${migrationSessionId}/student-training-context`,
      )
      && response.status() === 200
    ));
    await page.goto(
      `/student/training/${migrationSessionId}?profileId=student-unassigned`,
    );
    const context = await (await contextResponse).json() as {
      scene: { sceneId: string };
      currentAction: { actionRef: string } | null;
    };
    expect(context.scene.sceneId).toBe("scene-village-super-story-angle");
    expect(context.currentAction?.actionRef).toContain("compare");
  });

  await test.step("管理员看到 4/25/14+5 与零样本诚实边界", async () => {
    const requestOffset = requestedUrls.length;
    const manifestResponse = page.waitForResponse((response) => (
      response.request().method() === "GET"
      && response.url().endsWith("/api/admin/agent-rule-manifest")
      && response.status() === 200
    ));
    const evidenceResponse = page.waitForResponse((response) => (
      response.request().method() === "GET"
      && response.url().endsWith("/api/admin/agent-ablation-evidence")
      && response.status() === 200
    ));
    await page.goto(
      `/admin/readiness?profileId=operator-demo&sessionId=${migrationSessionId}`,
    );
    const manifest = await (await manifestResponse).json() as {
      courses: Array<{ chapters: unknown[] }>;
      baselineTopologyAgentIds: string[];
    };
    const evidence = await (await evidenceResponse).json() as {
      observationCount: number;
      runStatus: string;
      conclusion: string;
      blindReviewStatus: string;
      controls: { conditionLabelsHidden: boolean };
      groups: Array<{ conditionCode: string; runCount: number }>;
    };
    expect(manifest.courses).toHaveLength(courseContentReleases.length);
    expect(manifest.courses.flatMap((course) => course.chapters)).toHaveLength(courseContentSectionCount);
    expect(manifest.baselineTopologyAgentIds).toHaveLength(14);
    expect(evidence).toMatchObject({
      observationCount: 0,
      runStatus: "not_ready",
      conclusion: "insufficient_evidence",
      blindReviewStatus: "not_configured",
      controls: { conditionLabelsHidden: false },
    });
    expect(evidence.groups.map((group) => group.conditionCode).sort())
      .toEqual(["A", "B", "C"]);
    expect(evidence.groups.every((group) => group.runCount === 0)).toBe(true);

    await expect(page.locator(".v2-readiness-page")).toBeVisible();
    await expect(page.locator(".v2-rule-summary article strong"))
      .toHaveText([String(courseContentReleases.length), String(courseContentSectionCount), "14", "5"]);
    await expect(page.locator(".v2-rule-course-list > article")).toHaveCount(courseContentReleases.length);
    await expect(page.locator(".v2-ablation-count strong")).toHaveText("0");
    await expect(page.locator(".v2-ablation-groups > article")).toHaveCount(3);
    await expect(page.locator(".v2-ablation-boundary.insufficient")).toBeVisible();
    await expect(page.locator("body")).toContainText("私有随机盲分配尚未建立");
    await expect(page.locator("body")).not.toContainText("hypothesis_supported");
    await expect(page.locator("body")).not.toContainText("目标架构");
    await expect(page.locator("body")).not.toContainText("优越");
    await expectNoHorizontalOverflow(page);

    const adminUrls = requestedUrls.slice(requestOffset);
    for (const forbidden of [
      "/api/me/course-enrollments",
      "/learning-activity",
      "/student-training-context",
      "/collaboration-episode",
    ]) {
      expect(adminUrls.some((url) => url.includes(forbidden))).toBe(false);
    }
  });

  await test.step("390x844 师生管三端保持零横向溢出", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      `/student/training/${migrationSessionId}?profileId=student-unassigned`,
      `/teacher/director/${migrationSessionId}?profileId=teacher-class-a&sessionId=${migrationSessionId}`,
      `/admin/readiness?profileId=operator-demo&sessionId=${migrationSessionId}`,
    ]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("正在确认演示身份");
      await expectNoHorizontalOverflow(page);
    }
  });

  expect(runtimeProblems).toEqual([]);
});
