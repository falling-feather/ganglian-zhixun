import {
  expect,
  test,
  type Page,
  type Response,
} from "@playwright/test";

const SESSION_A = "demo-local-tourism";
const SESSION_B = "demo-local-tourism-b";
const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN ?? "http://127.0.0.1:5173";

interface BrowserBinding {
  bindingId: string;
  sessionId: string;
  actorId: string;
  actorKind: "student" | "teacher" | "agent" | "system";
  roleId: string;
}

interface BrowserAuthContext {
  profileId: string;
  bindings: BrowserBinding[];
}

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

function expectNoUnexpectedRuntime(
  problems: readonly string[],
  allowed: readonly RegExp[] = [],
): void {
  expect(problems.filter((problem) => (
    !allowed.some((pattern) => pattern.test(problem))
  ))).toEqual([]);
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

function authResponse(page: Page): Promise<Response> {
  return page.waitForResponse((response) => (
    response.request().method() === "POST"
    && response.url().endsWith("/api/auth/demo-session")
  ));
}

async function expectLegacyReplacement(
  page: Page,
  legacyPath: string,
  expectedPath: RegExp,
): Promise<Response> {
  const responsePromise = authResponse(page);
  await page.goto(legacyPath);
  const response = await responsePromise;
  await expect(page).toHaveURL(expectedPath);
  const url = new URL(page.url());
  for (const retired of ["view", "section", "mode"]) {
    expect(url.searchParams.has(retired)).toBe(false);
  }
  return response;
}

async function login(
  page: Page,
  profileId: string,
  sessionId: string,
): Promise<BrowserAuthContext> {
  const response = await page.request.post("/api/auth/demo-session", {
    headers: { Origin: WEB_ORIGIN },
    data: { profileId, sessionId },
  });
  expect(response.status()).toBe(200);
  return await response.json() as BrowserAuthContext;
}

function binding(
  auth: BrowserAuthContext,
  input: {
    sessionId: string;
    actorKind: "student" | "teacher";
    roleId?: string;
  },
): BrowserBinding {
  const result = auth.bindings.find((candidate) => (
    candidate.sessionId === input.sessionId
    && candidate.actorKind === input.actorKind
    && (input.roleId === undefined || candidate.roleId === input.roleId)
  ));
  if (!result) {
    throw new Error(
      `${auth.profileId} 缺少 ${input.sessionId}/${input.actorKind}/${input.roleId ?? "*"} 绑定`,
    );
  }
  return result;
}

function sessionReadUrl(
  sessionId: string,
  resource: "projection" | "timeline" | "collaboration-replay" | "trace" | "trace-page",
  bindingId: string,
): string {
  const query = new URLSearchParams({ bindingId });
  if (resource === "trace-page") query.set("limit", "20");
  return `/api/sessions/${encodeURIComponent(sessionId)}/${resource}?${query}`;
}

async function expectRead(
  page: Page,
  url: string,
  status = 200,
): Promise<unknown> {
  const response = await page.request.get(url);
  expect(response.status(), await response.text()).toBe(status);
  return status === 200 ? await response.json() as unknown : null;
}

test.describe.configure({ mode: "serial" });

test("合法学生旧地址只替换一次并进入 V2 安全课程边界", async ({ page }) => {
  const runtime = watchRuntime(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await expectLegacyReplacement(
    page,
    `/?view=student&section=communications&mode=course_platform`
      + `&profileId=student-team-a&sessionId=${SESSION_A}`,
    new RegExp(`/student/training/${SESSION_A}\\?profileId=student-team-a$`, "u"),
  );
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "你尚未认领这门课程" }))
    .toBeVisible();
  expect(requests.some((url) => url.includes("/api/admin/"))).toBe(false);
  expect(requests.some((url) => url.includes("/api/teacher/"))).toBe(false);
  expectNoUnexpectedRuntime(runtime);
});

test("合法教师旧课程设计地址替换到独立教师页面", async ({ page }) => {
  const runtime = watchRuntime(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await expectLegacyReplacement(
    page,
    `/?view=teacher&section=scenarios&mode=course_platform`
      + `&profileId=teacher-class-a&sessionId=${SESSION_A}`,
    /\/teacher\/courses\?profileId=teacher-class-a$/u,
  );
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "让人物走进课堂" })).toBeVisible();
  expect(requests.some((url) => url.includes("/api/me/course-enrollments")))
    .toBe(false);
  expect(requests.some((url) => url.includes("/api/admin/"))).toBe(false);
  expectNoUnexpectedRuntime(runtime);
});

test("合法管理员旧调试地址替换到 V1 只读运行追踪", async ({ page }) => {
  const runtime = watchRuntime(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await expectLegacyReplacement(
    page,
    `/?view=admin&section=debug&mode=course_platform`
      + `&profileId=operator-demo&sessionId=${SESSION_A}`,
    new RegExp(`/admin/trace\\?profileId=operator-demo&sessionId=${SESSION_A}$`, "u"),
  );
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "运行追踪" })).toBeVisible();
  expect(requests.some((url) => url.includes("/api/me/course-enrollments")))
    .toBe(false);
  expect(requests.some((url) => url.includes("/student-training-context")))
    .toBe(false);
  expectNoUnexpectedRuntime(runtime);
});

test("教师 A 访问 B 班旧导演地址必须 403 失败关闭", async ({ page }) => {
  const runtime = watchRuntime(page);
  const response = await expectLegacyReplacement(
    page,
    `/?view=teacher&section=director&mode=course_platform`
      + `&profileId=teacher-class-a&sessionId=${SESSION_B}`,
    new RegExp(`/teacher/director/${SESSION_B}\\?profileId=teacher-class-a$`, "u"),
  );
  expect(response.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "暂时无法建立演示身份" }))
    .toBeVisible();
  await expect(page.getByText("该身份不是目标班级或团队的有效成员"))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "课堂因果协作链" }))
    .toHaveCount(0);
  expectNoUnexpectedRuntime(runtime, [/status of 403 \(Forbidden\)/u]);
});

test("学生 A 访问 B 班旧训练地址必须 403 失败关闭", async ({ page }) => {
  const runtime = watchRuntime(page);
  const response = await expectLegacyReplacement(
    page,
    `/?view=student&section=communications&mode=course_platform`
      + `&profileId=student-team-a&sessionId=${SESSION_B}`,
    new RegExp(`/student/training/${SESSION_B}\\?profileId=student-team-a$`, "u"),
  );
  expect(response.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "暂时无法建立演示身份" }))
    .toBeVisible();
  await expect(page.locator(".v2-training-page")).toHaveCount(0);
  expectNoUnexpectedRuntime(runtime, [/status of 403 \(Forbidden\)/u]);
});

test("旧地址中的错角色身份不得静默替换成另一授权身份", async ({ page }) => {
  const runtime = watchRuntime(page);
  const requests: Array<{ method: string; url: string }> = [];
  page.on("request", (request) => requests.push({
    method: request.method(),
    url: request.url(),
  }));
  await page.goto(
    `/?view=teacher&section=director&mode=course_platform`
      + `&profileId=student-team-a&sessionId=${SESSION_A}`,
  );
  await expect(page).toHaveURL(
    new RegExp(`/teacher/director/${SESSION_A}\\?profileId=student-team-a$`, "u"),
  );
  const url = new URL(page.url());
  for (const retired of ["view", "section", "mode"]) {
    expect(url.searchParams.has(retired)).toBe(false);
  }
  await expect(page.getByRole("heading", { name: /身份与页面不匹配|暂时无法建立演示身份/u }))
    .toBeVisible();
  await expect(page.getByText("已停止认证和业务数据读取", { exact: false }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "课堂因果协作链" }))
    .toHaveCount(0);
  expect(requests.some((request) => (
    request.url.endsWith("/api/auth/demo-session")
  ))).toBe(false);
  expect(requests.some((request) => request.url.includes("/api/")))
    .toBe(false);
  expectNoUnexpectedRuntime(runtime);
});

test("V1 学生只读自己的 projection 与 timeline 且不能读取教师回放", async ({ page }) => {
  const teacherAuth = await login(page, "teacher-class-a", SESSION_A);
  const teacherBinding = binding(teacherAuth, {
    sessionId: SESSION_A,
    actorKind: "teacher",
  });
  const studentAuth = await login(page, "student-team-a", SESSION_A);
  const reporter = binding(studentAuth, {
    sessionId: SESSION_A,
    actorKind: "student",
    roleId: "reporter",
  });
  const projection = await expectRead(
    page,
    sessionReadUrl(SESSION_A, "projection", reporter.bindingId),
  ) as { sessionId: string; evidence: unknown[] };
  const timeline = await expectRead(
    page,
    sessionReadUrl(SESSION_A, "timeline", reporter.bindingId),
  ) as { events: unknown[] };
  expect(projection.sessionId).toBe(SESSION_A);
  expect(Array.isArray(projection.evidence)).toBe(true);
  expect(Array.isArray(timeline.events)).toBe(true);
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "projection", teacherBinding.bindingId),
    403,
  );
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "collaboration-replay", reporter.bindingId),
    403,
  );
});

test("V1 教师可复核业务回放但不能读取学生绑定或管理员 Trace", async ({ page }) => {
  const studentAuth = await login(page, "student-team-a", SESSION_A);
  const reporter = binding(studentAuth, {
    sessionId: SESSION_A,
    actorKind: "student",
    roleId: "reporter",
  });
  const teacherAuth = await login(page, "teacher-class-a", SESSION_A);
  const teacher = binding(teacherAuth, {
    sessionId: SESSION_A,
    actorKind: "teacher",
  });
  const projection = await expectRead(
    page,
    sessionReadUrl(SESSION_A, "projection", teacher.bindingId),
  ) as { sessionId: string; evidence: unknown[] };
  const timeline = await expectRead(
    page,
    sessionReadUrl(SESSION_A, "timeline", teacher.bindingId),
  ) as { events: unknown[] };
  const replay = await expectRead(
    page,
    sessionReadUrl(SESSION_A, "collaboration-replay", teacher.bindingId),
  ) as { schemaVersion: string; sessionId: string };
  expect(projection.sessionId).toBe(SESSION_A);
  expect(Array.isArray(projection.evidence)).toBe(true);
  expect(Array.isArray(timeline.events)).toBe(true);
  expect(replay).toMatchObject({
    schemaVersion: "collaboration-replay/1.0.0",
    sessionId: SESSION_A,
  });
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "projection", reporter.bindingId),
    403,
  );
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "trace", teacher.bindingId),
    403,
  );
});

test("V1 A/B 班只读会话互相隔离且 B 班仍可复核", async ({ page }) => {
  const teacherAAuth = await login(page, "teacher-class-a", SESSION_A);
  const teacherA = binding(teacherAAuth, {
    sessionId: SESSION_A,
    actorKind: "teacher",
  });
  const teacherBAuth = await login(page, "teacher-class-b", SESSION_B);
  const teacherB = binding(teacherBAuth, {
    sessionId: SESSION_B,
    actorKind: "teacher",
  });
  const projectionB = await expectRead(
    page,
    sessionReadUrl(SESSION_B, "projection", teacherB.bindingId),
  ) as { sessionId: string };
  const timelineB = await expectRead(
    page,
    sessionReadUrl(SESSION_B, "timeline", teacherB.bindingId),
  ) as { events: unknown[] };
  expect(projectionB.sessionId).toBe(SESSION_B);
  expect(Array.isArray(timelineB.events)).toBe(true);
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "projection", teacherA.bindingId),
    403,
  );
  await expectRead(
    page,
    sessionReadUrl(SESSION_A, "timeline", teacherA.bindingId),
    403,
  );
});

test("V1 operator 技术面独立提供 projection、timeline、replay 与 Trace", async ({ page }) => {
  const operatorAuth = await login(page, "operator-demo", SESSION_A);
  const operator = binding(operatorAuth, {
    sessionId: SESSION_A,
    actorKind: "teacher",
  });
  const [projection, timeline, replay, trace, tracePage] = await Promise.all([
    expectRead(page, sessionReadUrl(SESSION_A, "projection", operator.bindingId)),
    expectRead(page, sessionReadUrl(SESSION_A, "timeline", operator.bindingId)),
    expectRead(page, sessionReadUrl(SESSION_A, "collaboration-replay", operator.bindingId)),
    expectRead(page, sessionReadUrl(SESSION_A, "trace", operator.bindingId)),
    expectRead(page, sessionReadUrl(SESSION_A, "trace-page", operator.bindingId)),
  ]) as Array<Record<string, unknown>>;
  expect(projection?.sessionId).toBe(SESSION_A);
  expect(Array.isArray(timeline?.events)).toBe(true);
  expect(replay?.schemaVersion).toBe("collaboration-replay/1.0.0");
  expect(Array.isArray(trace?.records)).toBe(true);
  expect(tracePage?.schemaVersion).toBe("session-trace-page.v1");
});

test("390×844 三角色兼容页无溢出且旧导航不触发历史写路径", async ({ page }) => {
  const runtime = watchRuntime(page);
  const requests: Array<{ method: string; url: string }> = [];
  page.on("request", (request) => requests.push({
    method: request.method(),
    url: request.url(),
  }));
  await page.setViewportSize({ width: 390, height: 844 });

  await expectLegacyReplacement(
    page,
    "/?view=student&section=courses&mode=course_platform&profileId=student-unassigned",
    /\/student\/courses\?profileId=student-unassigned$/u,
  );
  await expect(page.getByRole("heading", { name: "我的课程档案" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expectLegacyReplacement(
    page,
    "/?view=teacher&section=scenarios&mode=course_platform&profileId=teacher-class-a",
    /\/teacher\/courses\?profileId=teacher-class-a$/u,
  );
  await expect(page.getByRole("heading", { name: "让人物走进课堂" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expectLegacyReplacement(
    page,
    `/?view=admin&section=debug&mode=course_platform`
      + `&profileId=operator-demo&sessionId=${SESSION_A}`,
    new RegExp(`/admin/trace\\?profileId=operator-demo&sessionId=${SESSION_A}$`, "u"),
  );
  await expect(page.getByRole("heading", { name: "运行追踪" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const nonAuthWrites = requests.filter((request) => (
    request.method !== "GET"
    && !request.url.endsWith("/api/auth/demo-session")
  ));
  expect(nonAuthWrites).toEqual([]);
  for (const forbidden of [
    "/commands",
    "/teacher-gates/",
    "/training-sessions",
    "/course-enrollments",
    "/sessions/demo/reset",
  ]) {
    expect(requests.some((request) => (
      request.method !== "GET" && request.url.includes(forbidden)
    )))
      .toBe(false);
  }
  expectNoUnexpectedRuntime(runtime);
});
