import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, LayoutDashboard, Library, Network, Radar, ScrollText, Settings2, ShieldCheck, Star } from "lucide-react";
import { BrandMark } from "./brand-mark";
import type { V2Route } from "./router";
import { ExperienceSettings } from "./experience-settings";
import "./experience-shell.css";

interface V2RoleShellProps { route: V2Route; contextSessionId?: string; navigate(path: string): void; children: ReactNode }
const adminItems = [
  { label: "管理总览", path: "/admin/overview", icon: LayoutDashboard },
  { label: "智能体全景", path: "/admin/agents", icon: Network },
  { label: "事件日志", path: "/admin/events", icon: ScrollText },
  { label: "运行追踪", path: "/admin/trace", icon: Radar },
  { label: "系统证据", path: "/admin/evidence", icon: ShieldCheck },
  { label: "质量与参赛", path: "/admin/readiness", icon: Star },
  { label: "教学资料", path: "/admin/materials", icon: Library },
] as const;

export function V2RoleShell({ route, navigate, children }: V2RoleShellProps) {
  const [settings, setSettings] = useState(false);
  useEffect(() => { document.documentElement.dataset.reducedMotion = String(localStorage.getItem("ganglian.motion") === "reduced"); }, []);
  if (route.kind === "student-training") return <div className="v2-immersive-shell">{children}</div>;
  if (route.kind === "admin") return <div className="v2-app-shell v2-role-admin">
    <header className="v2-topbar"><button type="button" className="v2-brand" onClick={() => navigate("/admin/overview")}><BrandMark /><strong>岗链智训</strong><span>管理端</span></button>
      <div className="v2-account-bar"><span>运行控制中心</span></div></header>
    <aside className="v2-sidebar"><nav aria-label="管理端页面">{adminItems.map(item => { const Icon = item.icon; const active = item.path === "/admin/" + route.page;
      return <button type="button" key={item.path} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => navigate(item.path)}><Icon /><span>{item.label}</span></button>; })}</nav></aside>
    <div className="v2-main">{children}</div>
  </div>;
  const teacher = route.kind === "teacher";
  const page = teacher ? route.page : route.kind;
  const navigation = teacher ? [
    { label: "学生档案", path: "/teacher/classes", active: ["classes", "director", "reviews"].includes(page) },
    { label: "课程导演", path: "/teacher/courses", active: page === "courses" },
    { label: "教学资料", path: "/teacher/materials", active: page === "materials" },
  ] : [
    { label: "我的课程", path: "/student/courses", active: ["student-courses", "student-course-detail"].includes(page) },
    { label: "我的作品", path: "/student/portfolio", active: ["student-portfolio", "student-review"].includes(page) },
    { label: "数字资料", path: "/student/materials", active: page === "student-materials" },
  ];
  return <div className="v3-shell">
    <header className="v3-topbar"><button type="button" className="v3-brand" onClick={() => navigate(teacher ? "/teacher/classes" : "/student/courses")}><BrandMark /><span>岗链智训</span></button>
      <nav aria-label={teacher ? "教师端页面" : "学生端页面"}>{navigation.map(item => <button type="button" key={item.path} className={item.active ? "active" : ""} aria-label={item.label} aria-current={item.active ? "page" : undefined} onClick={() => navigate(item.path)}><span className="v3-nav-full">{item.label}</span><span className="v3-nav-compact" aria-hidden="true">{teacher ? item.label === "教学资料" ? "资料" : item.label : item.label === "我的课程" ? "课程" : item.label === "我的作品" ? "作品" : "资料"}</span></button>)}</nav>
      <div className="v3-account"><details><summary>{teacher ? "教师" : "学生"}<ChevronDown /></summary><div className="v3-role-menu">
        {[{label:"学生体验",path:"/student/courses"},{label:"教师体验",path:"/teacher/classes"},{label:"运行管理",path:"/admin/overview"}].map(item => <button type="button" key={item.path} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); navigate(item.path); }}>{item.label}</button>)}
      </div></details><button type="button" aria-label="体验设置" onClick={() => setSettings(true)}><Settings2 /></button></div>
    </header>
    <div className="v3-shell-body">{children}</div>
    {settings ? <ExperienceSettings onClose={() => setSettings(false)} /> : null}
  </div>;
}
