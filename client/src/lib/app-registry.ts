import {
  Bot,
  Calendar,
  Briefcase,
  Headphones,
  Home,
  ListTodo,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  Users,
  Voicemail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasPermission, type PermissionAction, type PermissionMap, type PermissionModule } from "@shared/permissions";

export interface AppRegistryItem {
  id: string;
  name: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  softColor: string;
  iconColor: string;
  badge?: string | number | null;
  showInQuickAccess?: boolean;
  requiredPermission?: {
    module: PermissionModule;
    action?: PermissionAction;
  };
}

export const activeApps: AppRegistryItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    label: "Dashboard",
    description: "Overview & Quick Actions",
    href: "/",
    icon: Home,
    color: "bg-blue-500",
    softColor: "bg-blue-100",
    iconColor: "text-blue-600",
    requiredPermission: { module: "ai", action: "read" },
  },
  {
    id: "calls",
    name: "Calls",
    label: "Calls",
    description: "Call History & Management",
    href: "/call-log",
    icon: Phone,
    color: "bg-green-500",
    softColor: "bg-green-100",
    iconColor: "text-green-600",
    showInQuickAccess: true,
    requiredPermission: { module: "calls", action: "read" },
  },
  {
    id: "voicemail",
    name: "Voicemail",
    label: "Voicemail",
    description: "Voice Messages",
    href: "/voicemail",
    icon: Voicemail,
    color: "bg-purple-500",
    softColor: "bg-purple-100",
    iconColor: "text-purple-600",
    showInQuickAccess: true,
    requiredPermission: { module: "calls", action: "read" },
  },
  {
    id: "contacts",
    name: "Contacts",
    label: "Contacts",
    description: "Customer Directory",
    href: "/contacts",
    icon: Users,
    color: "bg-indigo-500",
    softColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
    showInQuickAccess: true,
    requiredPermission: { module: "contacts", action: "read" },
  },
  {
    id: "messages",
    name: "Messages",
    label: "Messages",
    description: "SMS & Text Communications",
    href: "/sms",
    icon: MessageSquare,
    color: "bg-green-600",
    softColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "3",
    showInQuickAccess: true,
    requiredPermission: { module: "messages", action: "read" },
  },
  {
    id: "calendar",
    name: "Calendar",
    label: "Calendar",
    description: "Events & Scheduling",
    href: "/calendar",
    icon: Calendar,
    color: "bg-purple-500",
    softColor: "bg-violet-100",
    iconColor: "text-violet-600",
    showInQuickAccess: true,
    requiredPermission: { module: "calendar", action: "read" },
  },
  {
    id: "email",
    name: "Email",
    label: "Email",
    description: "Email Management & Automation",
    href: "/email",
    icon: Mail,
    color: "bg-orange-500",
    softColor: "bg-orange-100",
    iconColor: "text-orange-600",
    showInQuickAccess: true,
    requiredPermission: { module: "email", action: "read" },
  },
  {
    id: "todo",
    name: "Todo",
    label: "Todo",
    description: "Tasks & Reminders",
    href: "/todo",
    icon: ListTodo,
    color: "bg-blue-600",
    softColor: "bg-sky-100",
    iconColor: "text-sky-600",
    showInQuickAccess: true,
    requiredPermission: { module: "tasks", action: "read" },
  },
  {
    id: "projects",
    name: "Projects",
    label: "Projects",
    description: "Goals, stages, dependencies & KPIs",
    href: "/project-intelligence",
    icon: Briefcase,
    color: "bg-amber-600",
    softColor: "bg-amber-100",
    iconColor: "text-amber-700",
    showInQuickAccess: true,
    requiredPermission: { module: "projects", action: "read" },
  },
  {
    id: "assistant",
    name: "AI Assistant",
    label: "AI Assistant",
    description: "Natural language control",
    href: "/ai-assistant",
    icon: Bot,
    color: "bg-cyan-600",
    softColor: "bg-cyan-100",
    iconColor: "text-cyan-700",
    showInQuickAccess: true,
    requiredPermission: { module: "ai", action: "read" },
  },
  {
    id: "crm",
    name: "CRM",
    label: "CRM",
    description: "Leads, pipeline & sales activity",
    href: "/crm-dashboard",
    icon: Users,
    color: "bg-teal-600",
    softColor: "bg-teal-100",
    iconColor: "text-teal-700",
    showInQuickAccess: true,
    requiredPermission: { module: "crm", action: "read" },
  },
  {
    id: "support",
    name: "Support",
    label: "Support",
    description: "Tickets & support operations",
    href: "/support-department",
    icon: Headphones,
    color: "bg-fuchsia-600",
    softColor: "bg-fuchsia-100",
    iconColor: "text-fuchsia-700",
    showInQuickAccess: true,
    requiredPermission: { module: "support", action: "read" },
  },
  {
    id: "settings",
    name: "Settings",
    label: "Settings",
    description: "System Configuration",
    href: "/system-settings",
    icon: Settings,
    color: "bg-gray-600",
    softColor: "bg-gray-100",
    iconColor: "text-gray-600",
    requiredPermission: { module: "settings", action: "read" },
  },
];

export function canAccessApp(app: AppRegistryItem, permissions?: PermissionMap | null) {
  if (!app.requiredPermission) return true;
  return hasPermission(permissions, app.requiredPermission.module, app.requiredPermission.action || "read");
}

export function getVisibleApps(permissions?: PermissionMap | null) {
  return activeApps.filter((app) => canAccessApp(app, permissions));
}

export function getQuickAccessApps(permissions?: PermissionMap | null) {
  return getVisibleApps(permissions).filter((app) => app.showInQuickAccess);
}

export function getBottomDockApps(permissions?: PermissionMap | null) {
  return getVisibleApps(permissions).filter((app) =>
    ["dashboard", "calls", "crm", "projects", "messages"].includes(app.id)
  );
}

export const quickAccessApps = activeApps.filter((app) => app.showInQuickAccess);
export const bottomDockApps = activeApps.filter((app) =>
  ["dashboard", "calls", "crm", "projects", "messages"].includes(app.id)
);
