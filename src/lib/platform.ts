// Shared, browser-safe description of the platform's modules.
import {
  LayoutDashboard, Compass, BookOpen, FileText, Mic, ClipboardCheck, Code2,
  FolderKanban, Briefcase, Building2, Users, Settings, GraduationCap,
} from "lucide-react";

export type Module = {
  title: string;
  url: string;
  icon: typeof Compass;
  description: string;
  status: "available" | "coming_soon";
};

export const MODULES: Module[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, description: "Your progress and shortcuts", status: "available" },
  { title: "Career Path", url: "/career-paths", icon: Compass, description: "Explore roles, skills, salaries (estimates) and timelines", status: "available" },
  { title: "Learning Plan", url: "/learning-plan", icon: BookOpen, description: "AI-generated weekly roadmap from your goals and time", status: "available" },
  { title: "Resume Analyzer", url: "/resume", icon: FileText, description: "Upload a resume and get evidence-based feedback for a role", status: "available" },
  { title: "Mock Interviews", url: "/interviews", icon: Mic, description: "Practice interviews with AI questions and feedback", status: "available" },
  { title: "Skill Assessments", url: "/assessments", icon: ClipboardCheck, description: "Quick AI quizzes to test a skill", status: "available" },
  { title: "Coding Practice", url: "/coding", icon: Code2, description: "Solve problems and get AI code review", status: "available" },
  { title: "Projects", url: "/projects", icon: FolderKanban, description: "Track portfolio projects", status: "available" },
  { title: "Job Tracker", url: "/jobs", icon: Briefcase, description: "Track your job applications and statuses", status: "available" },
  { title: "Company Prep", url: "/companies", icon: Building2, description: "Interview preparation guides by company", status: "available" },
  { title: "AI Mentor", url: "/mentor", icon: GraduationCap, description: "Your personal AI career coach with saved conversations", status: "available" },
  { title: "Community", url: "/community", icon: Users, description: "Discussions and study groups", status: "coming_soon" },
  { title: "Settings", url: "/settings", icon: Settings, description: "Profile, appearance and account", status: "available" },
];
