import { expect, test, type Page } from '@playwright/test';
import type { TeacherStudentArchiveV3 } from '../packages/contracts/src/index.js';
import { openArchiveDossier, revealArchiveDetails } from './fixtures/archive-flow';

async function login(page: Page, username: string, role: 'student' | 'teacher') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/login?role=${role}`);
  await page.getByRole('textbox', { name: '账号', exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill('Demo2026');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(role === 'student' ? '/student/courses' : '/teacher/classes'));
}

test('真实登录恢复身份，名册成员不能直接进入旧课程，管理员页面保持禁用', async ({ page }) => {
  await login(page, 'student1', 'student');
  const before = await (await page.request.get('/api/auth/session')).json();
  expect(before.profileId).toBe('student-unassigned');
  const denied = await page.request.post('/api/auth/demo-session', {
    headers: { origin: new URL(page.url()).origin },
    data: { profileId: 'student-roster-4', sessionId: 'demo-local-tourism' },
  });
  expect(denied.status()).toBe(403);
  await page.reload();
  await expect(page.locator('.v3-archive')).toHaveAttribute('data-ready', 'true');
  expect((await (await page.request.get('/api/auth/session')).json()).principal.principalId)
    .toBe(before.principal.principalId);
  await page.goto('/admin/readiness');
  await expect(page.getByText('管理页面已禁用', { exact: true })).toBeVisible();
});

test('三个学生通过页面独立开课，教师从两班名册读取真实课程', async ({ browser, page, baseURL }) => {
  test.setTimeout(180_000);
  if (!baseURL) throw new Error('未配置浏览器测试地址');
  const sessions: string[] = [];
  for (const username of ['student1', 'student2', 'student3']) {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 } });
    try {
      const student = await context.newPage();
      await login(student, username, 'student');
      const sessionId = await openArchiveDossier(student, '社区深度采访');
      const study = await (await student.request.get('/api/v3/me/study')).json();
      expect(study.currentSessionId).toBe(sessionId);
      sessions.push(sessionId);
    } finally {
      await context.close();
    }
  }
  expect(new Set(sessions).size).toBe(3);
  await login(page, 'teacher', 'teacher');
  await expect(page.getByRole('combobox', { name: '选择班级' })).toBeEnabled();
  const response = await page.request.get('/api/v3/teacher/student-archive');
  expect(response.ok()).toBe(true);
  const archive = await response.json() as TeacherStudentArchiveV3;
  expect(archive.classrooms).toHaveLength(2);
  expect(archive.students).toHaveLength(20);
  for (const classroom of archive.classrooms) {
    expect(archive.students.filter(student => student.classroomId === classroom.classroomId)).toHaveLength(10);
  }
  expect(archive.students.filter(student => sessions.includes(student.currentSessionId ?? ''))).toHaveLength(3);
  const student = archive.students.find(student => student.studentId === 'student-unassigned');
  const course = student?.runs.find(run => run.sessionId === student.currentSessionId);
  expect(course?.sessionId).toBe(sessions[0]);
  const reader = await revealArchiveDetails(page, '学生1');
  await expect(reader).toContainText(course!.title);
});
