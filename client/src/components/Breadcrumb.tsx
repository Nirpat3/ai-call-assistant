import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

const routeMap: Record<string, { label: string; parent?: string; group?: string }> = {
  "/": { label: "Dashboard" },
  "/calls": { label: "Recent Calls", group: "Call Operations" },
  "/call-log": { label: "Call Log", group: "Call Operations" },
  "/voicemail": { label: "Voicemail", group: "Call Operations" },
  "/knowledge-base": { label: "Knowledge Base", group: "Knowledge Management" },
  "/contacts": { label: "Contacts", group: "Contact Operations" },
  "/analytics/calls": { label: "Call Analytics", group: "Analytics" },
  "/analytics/ai": { label: "AI Performance", group: "Analytics" },
  "/ai-settings": { label: "AI Configuration", group: "AI Management" },
  "/ai-agents": { label: "AI Agents", group: "AI Management" },
  "/agent-training": { label: "Agent Training", group: "AI Management" },
  "/agent-demo": { label: "Agent Demo", group: "AI Management" },
  "/settings/call-settings": { label: "Call Settings", group: "Settings" },
  "/settings/ai-config": { label: "AI Configuration", group: "Settings" },
  "/settings/sitemap": { label: "Sitemap", group: "Settings" },
  "/settings/integrations": { label: "Integration Management", group: "Settings" },
  "/settings/system": { label: "System Settings", group: "Settings" },
  "/testing": { label: "Testing Center", group: "Development Tools" },
  "/support": { label: "Support Center", group: "Support" },
};

export default function Breadcrumb() {
  const [location] = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Dashboard", path: "/" }
    ];

    if (location === "/") {
      breadcrumbs[0].isActive = true;
      return breadcrumbs;
    }

    const currentRoute = routeMap[location];
    if (!currentRoute) {
      return breadcrumbs;
    }

    // Add group breadcrumb if exists
    if (currentRoute.group) {
      breadcrumbs.push({
        label: currentRoute.group,
        path: "#",
      });
    }

    // Add current page
    breadcrumbs.push({
      label: currentRoute.label,
      path: location,
      isActive: true
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Home className="h-4 w-4" />
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          {item.isActive ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : item.path === "#" ? (
            <span className="text-gray-500">{item.label}</span>
          ) : (
            <Link href={item.path}>
              <span className="hover:text-gray-900 cursor-pointer">{item.label}</span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}