import { z } from "zod";
import { V2IdentifierSchema, V2ContentHashSchema } from "./course-learning.js";
import { FieldInterviewViewV1Schema } from "./field-interview-v1.js";

export const CharacterWorkflowV3Schema = z.object({
  nodes: z.array(z.object({ id: V2IdentifierSchema, kind: z.enum(["understand", "knowledge", "memory", "decide", "tools", "reply"]),
    label: z.string().trim().min(1).max(40), enabled: z.boolean(), instruction: z.string().max(1600) }).strict()).length(6),
  memoryWindow: z.number().int().min(1).max(16),
}).strict().superRefine((flow, context) => {
  if (new Set(flow.nodes.map(node => node.kind)).size !== 6 || new Set(flow.nodes.map(node => node.id)).size !== 6) context.addIssue({ code: "custom", message: "流程需要六个不同职责的节点" });
  if (flow.nodes.some(node => ["understand", "decide", "reply"].includes(node.kind) && !node.enabled)) context.addIssue({ code: "custom", message: "理解、决策、回应是人物运行的必要节点" });
});
export const CharacterBlueprintV3Schema = z.object({
  id: V2IdentifierSchema, name: z.string().trim().min(1).max(40), role: z.string().trim().min(2).max(80), nodeId: V2IdentifierSchema,
  goal: z.string().trim().min(5).max(1000), personality: z.string().trim().min(5).max(2000),
  unknown: z.string().trim().min(5).max(1000), greeting: z.string().trim().min(2).max(500),
  appearance: FieldInterviewViewV1Schema.shape.people.element.shape.appearance.unwrap(),
  social: z.object({ supportsContact: z.boolean(), initialTrust: z.number().int().min(0).max(100), contactThreshold: z.number().int().min(0).max(100),
    referralThreshold: z.number().int().min(0).max(100), referralTargets: z.array(V2IdentifierSchema).max(20), refusal: z.string().trim().min(2).max(500) }).strict(),
  knowledgeIds: z.array(V2IdentifierSchema).max(30),
  topics: z.array(z.object({ id: V2IdentifierSchema, title: z.string().trim().min(2).max(120), keywords: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
    response: z.string().trim().min(10).max(4000), sourceKind: z.enum(["simulation", "reference_guide"]), sourceTitle: z.string().trim().min(2).max(160), sourceUrl: z.string().url().nullable() }).strict()).min(1).max(20),
  workflow: CharacterWorkflowV3Schema,
}).strict();
export const CharacterStudioDraftV3Schema = z.object({
  courseId: V2IdentifierSchema, classroomId: V2IdentifierSchema, revision: z.number().int().nonnegative(),
  baseLessonHash: V2ContentHashSchema, characters: z.array(CharacterBlueprintV3Schema).max(30), contentHash: V2ContentHashSchema,
  updatedAt: z.string().datetime(),
}).strict();
export const CharacterStudioWorkspaceV3Schema = z.object({
  courses: z.array(z.object({ courseId: V2IdentifierSchema, title: z.string(), region: z.string(), regionId: V2IdentifierSchema }).strict()),
  draft: CharacterStudioDraftV3Schema,
  nodes: z.array(z.object({ id: V2IdentifierSchema, title: z.string() }).strict()),
  people: z.array(z.object({ id: V2IdentifierSchema, name: z.string(), role: z.string() }).strict()),
  knowledge: z.array(z.object({ knowledgeId: V2IdentifierSchema, title: z.string(), reviewStatus: z.string() }).strict()),
  publication: z.object({ releaseId: V2IdentifierSchema, draftRevision: z.number().int().positive(), lessonHash: V2ContentHashSchema, publishedAt: z.string().datetime() }).strict().nullable(),
}).strict();
export type CharacterWorkflowV3 = z.infer<typeof CharacterWorkflowV3Schema>;
export type CharacterBlueprintV3 = z.infer<typeof CharacterBlueprintV3Schema>;
export type CharacterStudioDraftV3 = z.infer<typeof CharacterStudioDraftV3Schema>;
export type CharacterStudioWorkspaceV3 = z.infer<typeof CharacterStudioWorkspaceV3Schema>;

export function createDefaultCharacterWorkflowV3(): CharacterWorkflowV3 {
  return { memoryWindow: 6, nodes: [
    { id: "understand", kind: "understand", label: "理解来意", enabled: true, instruction: "区分具体采访、模糊请求与转述；不清楚时先问一句。" },
    { id: "knowledge", kind: "knowledge", label: "检索知识", enabled: true, instruction: "只使用本人掌握的资料，说明不知道或尚未核实的部分。" },
    { id: "memory", kind: "memory", label: "承接关系", enabled: true, instruction: "联系双方已经发生的交流、承诺和关系，不编造过去。" },
    { id: "decide", kind: "decide", label: "判断意愿", enabled: true, instruction: "根据自己的目标、边界与当前关系决定是否配合。" },
    { id: "tools", kind: "tools", label: "人物行动", enabled: true, instruction: "由后台工具处理获准的工作联络或引荐，不以口头回答代替完成。" },
    { id: "reply", kind: "reply", label: "自然表达", enabled: true, instruction: "自然、简洁地回应当前问题，保留可追溯的实际结果。" },
  ] };
}
