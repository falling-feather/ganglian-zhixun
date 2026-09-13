import type { FieldInterviewActionV1, FieldInterviewViewV1, FlagshipEvidenceAssessmentViewV4, TeachingTaskDraftV1, TeachingTaskSessionV1, TeachingTaskReleaseV1 } from "../../packages/contracts/src/index.js";
import type { FlagshipMediaWorkspaceV4 } from "../../apps/api/src/flagship-media-v4.js";
import type { FlagshipStudentWorkServiceV3 } from "../../apps/api/src/flagship-student-work-v3.js";
import type { DemoAuthContext } from "../../apps/api/src/identity.js";
import { fieldWorkSamples, type FieldSampleRoute } from "./field-work-samples";
import {courseFieldLessonsV3} from '../../packages/course-content/src/index.js';

type Workspace = Awaited<ReturnType<FlagshipStudentWorkServiceV3["getWorkspace"]>>;
export class V260FixtureActor {
  private headers: Record<string, string> = {};
  auth!: DemoAuthContext;
  constructor(readonly origin: string) {
    if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw new Error("Fixtures require a local test server");
  }
  async login(profileId: string, sessionId?: string) {
    const response = await fetch(`${this.origin}/api/auth/demo-session`, { method: "POST", headers: { origin: this.origin, "content-type": "application/json" },
      body: JSON.stringify({ profileId, ...(sessionId ? { sessionId } : {}) }) });
    if (!response.ok) throw new Error(`Demo login failed: ${response.status} ${await response.text()}`);
    this.auth = await response.json() as DemoAuthContext;
    this.headers = { origin: this.origin, "content-type": "application/json", cookie: response.headers.get("set-cookie")!.split(";")[0]!, "x-csrf-token": this.auth.csrfToken };
    return this;
  }
  async request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.origin}${path}`, { method, headers: this.headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error(`${method} ${path.split("?")[0]}: ${response.status} ${await response.text()}`);
    return await response.json() as T;
  }
  binding(sessionId: string, kind: "student" | "teacher") { return this.auth.bindings.find(item => item.sessionId === sessionId && item.actorKind === kind)!.bindingId; }
}

export async function createFieldLoop(origin: string, route: FieldSampleRoute, unique: string) {
  const teacher = await new V260FixtureActor(origin).login("teacher-class-a", "demo-xunpu-v2");
  const author = { authorizationSessionId: "demo-xunpu-v2", bindingId: teacher.binding("demo-xunpu-v2", "teacher") };
  const templateId = route === "resident" ? "community-story" : "public-service";
  const generated = await teacher.request<{ status: string; draft: TeachingTaskDraftV1 }>("POST", "/api/teaching-tasks/generate", { ...author, requestId: `fixture-generate-${unique}`, input: {
    title: `${route === "resident" ? "日常劳动人物" : "公共服务范围"}闭环验收 ${unique}`, templateId, durationMinutes: 55, learnerLevel: "beginner",
    brief: route === "resident" ? "为年轻读者采访社区人物日常劳动，说明个人经历和记录范围" : "为初次到访游客核对公共服务公告与咨询时点，形成可持续更新的指引",
    audience: "初次了解社区的读者与需要咨询信息的游客", learnerContext: "已经学习基础采访，练习来源核对、许可范围与编辑选择",
    sourceKind: "teaching_example", sourceStatement: "可复现工程验收的教学仿真委托，不是真实试用反馈", focusCriteria: [] } });
  if (generated.status !== "draft_created") throw new Error("Fixture task was not generated");
  const published = await teacher.request<{ release: TeachingTaskReleaseV1 }>("POST", `/api/teaching-tasks/${generated.draft.taskId}/publish`, { ...author,
    requestId: `fixture-publish-${unique}`, expectedRevision: generated.draft.revision, contentHash: generated.draft.contentHash, confirmation: "工程验收中模拟教师核对任务与资料范围后发布，不代表真实教师专业评价。" });
  const profile = route === "resident" ? "student-unassigned" : "student-team-a";
  const student = await new V260FixtureActor(origin).login(profile);
  const current=await student.request<import('../../packages/contracts/src/index.js').StudentStudyV3>('GET','/api/v3/me/study');
  if(current.currentSessionId)await student.request('POST','/api/v3/me/study/cancel',{requestId:`fixture-cancel-${unique}`,sessionId:current.currentSessionId,expectedRevision:current.revision,confirmation:'abandon'});
  const { session } = await student.request<{ session: TeachingTaskSessionV1 }>("PUT", `/api/teaching-tasks/releases/${published.release.ref.releaseId}/my-session`, {});
  return connectFieldLoop(origin, route, profile, session, unique);
}

export async function connectFieldLoop(origin: string, route: FieldSampleRoute, profile: string,
  session: Pick<TeachingTaskSessionV1, "sessionId" | "bindingId" | "title">, unique: string) {
  const teacher = await new V260FixtureActor(origin).login("teacher-class-a", session.sessionId);
  const student = await new V260FixtureActor(origin).login(profile, session.sessionId);
  const bindingId = session.bindingId!;
  const read = async () => (await student.request<{ view: FieldInterviewViewV1 }>("GET", `/api/v4/sessions/${session.sessionId}/interview?bindingId=${bindingId}`)).view;
  let seq = 0;
  const act = async (action: FieldInterviewActionV1) => student.request<{ view: FieldInterviewViewV1 }>("POST", `/api/v4/sessions/${session.sessionId}/interview/actions`, {
    schemaVersion: "field-interview-action/1.0.0", requestId: `fixture-action-${unique}-${++seq}`, sessionId: session.sessionId, bindingId,
    expectedWorldStateVersion: (await read()).worldStateVersion, action });
  const talk = (npcId: string, text: string, channel: "scene" | "chat" = "chat") => act({ kind: "talk", npcId, channel, text });
  const choose = (npcId: string, choiceId: string, rationale: string, channel: "scene" | "chat" = "chat") => act({ kind: "choose", npcId, choiceId, rationale, channel });
  const inspect = (materialId: string) => act({ kind: "inspect", materialId });
  const workspace = async () => (await student.request<{ workspace: Workspace }>("GET", `/api/v3/sessions/${session.sessionId}/workspace?bindingId=${bindingId}`)).workspace;
  const assessment = async () => (await student.request<{ assessment: FlagshipEvidenceAssessmentViewV4 }>("GET", `/api/v4/sessions/${session.sessionId}/evidence-assessment?bindingId=${bindingId}`)).assessment;
  const save = async (artifactId: string, fields: Record<string, string>, evidenceRefs: string[], submit = true) => {
    const previous = (await workspace()).artifacts.find(item => item.artifactId === artifactId)!;
    const response = await student.request<{ workspace: Workspace }>("POST", `/api/v3/sessions/${session.sessionId}/workspace/artifacts/${artifactId}/revisions`, {
      bindingId, requestId: `fixture-save-${unique}-${++seq}`, expectedRevisionNumber: previous.revisionCount,
      fields: Object.entries(fields).map(([fieldId, content]) => ({ fieldId, content })), evidenceRefs, revisionNote: "按本场资料形成工程验收的仿真作业，保存原版本与真实引用。" });
    const revision = response.workspace.artifacts.find(item => item.artifactId === artifactId)!.latestRevision!;
    if (submit) await student.request("POST", `/api/v3/sessions/${session.sessionId}/workspace/artifacts/${artifactId}/submit`, {
      bindingId, requestId: `fixture-submit-${unique}-${++seq}`, revisionId: revision.revisionId, contentHash: revision.contentHash });
    return revision;
  };
  return { teacher, student, session, bindingId, profile, route, read, act, talk, choose, inspect, workspace, assessment, save };
}
export type FieldLoopFixture = Awaited<ReturnType<typeof createFieldLoop>>;

export async function performFieldRoute(loop: FieldLoopFixture, compareSources=false) {
  const nodes=courseFieldLessonsV3[0]!.lesson.nodes;
  const go=async(destination:string)=>{
    const view=await loop.read(),queue=[[view.nodeId]],seen=new Set<string>();
    while(queue.length){const path=queue.shift()!,last=path.at(-1)!;if(last===destination){for(const nodeId of path.slice(1))await loop.act({kind:'travel',nodeId});return;}
      if(seen.has(last))continue;seen.add(last);
      for(const exit of nodes.find(node=>node.id===last)!.exits??[])if(!nodes.find(node=>node.id===exit.targetId)!.requiresFlag||view.nodes.find(node=>node.id===exit.targetId)?.allowed)queue.push([...path,exit.targetId]);
    }
    throw new Error('No allowed fixture route to '+destination);
  };
  const meet=async(id:string,text:string)=>{const person=courseFieldLessonsV3[0]!.lesson.people.find(person=>person.id===id);if(!person)throw new Error('Unknown fixture person '+id);await go(person.nodeId);
    if(!(await loop.read()).people.some(person=>person.id===id))throw new Error('Person is absent from the arrived scene: '+id);await loop.talk(id,text,'scene');};
  await loop.inspect('material-notice-board');
  if(loop.route==='resident'){
    await meet('entity-community-source','请讲讲今天材料准备和日常劳动的具体安排。');
    await loop.choose('entity-community-source','ahuan-scope','先确认文字和不识别人物环境记录的范围。','scene');
    await loop.talk('entity-community-source','我准备引用您的原话，请核对完整语境和这一次个人经历。','scene');
    await loop.choose('entity-community-source','ahuan-courtyard-entry','只进入本人明确同意的区域。','scene');
    await go('loc-community-courtyard');await loop.inspect('xp-courtyard-observation');await go('xp-courtyard-threshold');
  }
  await meet('entity-tourist','请讲讲您这一次出行的体验、问路和实际需要。');
  await loop.choose('entity-tourist','zhou-no-closeup','尊重不使用近景的意愿，保留文字与环境记录。','scene');
  await meet('entity-shopkeeper','请介绍经营者的一天，预约和实际到店有什么区别？');
  await loop.talk('entity-shopkeeper','这份样片怎样确定提供者与许可范围？','scene');
  await loop.choose('entity-shopkeeper','wu-interview-only','谢绝样片，把经营观点作为一个有明确立场的信源。','scene');
  await go('loc-waterfront-service-point');await loop.inspect('material-local-standard');await loop.inspect('material-public-service');
  await meet('entity-researcher','怎样比较原文与转引的名录范围和标准年份？');
  await meet('entity-public-liaison','请核对公告版本与现场咨询位置的变化。');await loop.inspect('material-service-update');
  await meet('entity-platform-duty','图文和视频怎样保留同样的事实范围？');
  await loop.choose('entity-platform-duty','qiao-hold','暂缓没有充分核实的片段，保留继续调查的安排。','scene');
  if(compareSources){
    await meet('xp-florist','请说明花材选择标准与准备过程。');
    await meet('entity-inheritor','本轮教学如何组织示范和练习？');
    await loop.choose('entity-inheritor','huang-invitation','在确认的范围观察一个步骤，不替学员决定拍摄。','scene');
    await meet('xp-craft-assistant','怎样区分示范和学员独立完成的步骤？');
    await meet('entity-researcher','现在已经取得两份材料，想继续讨论来源的范围。');
    await loop.choose('entity-researcher','followup-source-compare','对照两位实际受访者的记录，区分材料准备与学习过程。','scene');
  }
}

export async function submitFieldCoursework(loop: FieldLoopFixture) {
  const samples = fieldWorkSamples(loop.route);
  const current = await loop.workspace();
  const refs:string[] = [];
  if (refs.length > 48) throw new Error("Fixture evidence must fit the editor without truncation");
  for (const [id, fields] of Object.entries(samples)) {
    if(!current.artifacts.some(artifact=>artifact.artifactId===id))continue;
    if (id === "artifact-feature-story") {
      await loop.save(id, fields, refs, false);
      await loop.save(id, { ...fields, lead: `${fields.lead}本次修订补充了信息时点与人物表达的范围。` }, refs);
    } else await loop.save(id, fields, refs);
  }
  const media = (await loop.student.request<{ workspace: FlagshipMediaWorkspaceV4 }>("GET", `/api/v4/sessions/${loop.session.sessionId}/media-workspace?bindingId=${loop.bindingId}`)).workspace;
  const selected = ["image", "audio", "video"].map(kind => {
    const asset = media.catalog.find(item => item.mediaKind === kind && item.transformable && item.rightsStatus === "cleared");
    if (!asset) throw new Error(`No usable fixture media: ${kind}`);
    return asset;
  });
  await loop.student.request("POST", `/api/v4/sessions/${loop.session.sessionId}/media-revisions`, { bindingId: loop.bindingId,
    artifactRef: "artifact-multiplatform-package", requestId: `fixture-media-${loop.session.sessionId}`, expectedRevisionNumber: 0, status: "submitted",
    sourceAssetRefs: selected.map(item => item.assetRef), supportingEvidenceRefs: selected.map(item => item.rightsReceiptRef),
    operations: selected.map(asset => asset.mediaKind === "image" ? { operationKind: "crop", inputAssetRef: asset.assetRef, region: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, rationale: "保留环境信息，减少无关边缘，生成可回读的课堂图像。" }
      : { operationKind: "trim", inputAssetRef: asset.assetRef, startMs: 0, endMs: 1000, rationale: "截取课堂仿真素材片段，保留来源与生成标识，实际声音和画面仍需人工复核。" }),
    studentEditorialRationale: "本次使用课堂仿真素材，图文解释原公告和更新范围，短片保留相同限定；派生文件证明加工实际发生，其语义一致性仍需教师观看原件复核。" });
  return { refs, samples, assessment: await loop.assessment() };
}
