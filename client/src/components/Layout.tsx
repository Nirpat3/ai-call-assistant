import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, Bell, Settings, User, LogOut, Home, Phone, Brain, Users, BarChart3, Clock, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import OrganizationSwitcher from "@/components/dashboard/OrganizationSwitcher";
import NotificationIcon from "@/components/NotificationIcon";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  const { data: aiConfig } = useQuery<any>({
    queryKey: ["/api/ai-config"],
  });

  const navigationItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/call-log", icon: Phone, label: "Call Log" },
    { href: "/voicemail", icon: Phone, label: "Voicemail" },
    { href: "/settings/call-management", icon: Bot, label: "Call Management" },
    { href: "/knowledge-base", icon: Brain, label: "Knowledge Base" },
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/analytics/calls", icon: BarChart3, label: "Call Analytics" },
    { href: "/analytics/ai", icon: BarChart3, label: "AI Analytics" },
    { href: "/ai-settings", icon: Settings, label: "AI Settings" },
    { href: "/system-settings", icon: Settings, label: "System Settings" },
    { href: "/timezone-settings", icon: Clock, label: "Timezone Settings" },
  ];

  const getPageTitle = () => {
    if (title) return title;
    
    const currentItem = navigationItems.find(item => item.href === location);
    if (currentItem) return currentItem.label;
    
    // Dynamic titles based on route
    if (location === "/") return "Dashboard";
    if (location.startsWith("/contacts/")) return "Contact Profile";
    if (location.includes("analytics")) return "Analytics";
    if (location.includes("settings")) return "Settings";
    
    return "AI Call Assistant";
  };

  const getPageSubtitle = () => {
    if (subtitle) return subtitle;
    
    if (location === "/") return "Monitor and manage your AI call assistant";
    if (location === "/call-log") return "View and manage call history";
    if (location === "/voicemail") return "Manage voicemail messages";
    if (location === "/knowledge-base") return "Manage AI knowledge and responses";
    if (location === "/contacts") return "Manage customer contacts";
    if (location.includes("analytics")) return "View performance metrics and insights";
    if (location.includes("settings")) return "Configure system settings";
    
    return "";
  };

  const NavigationMenu = ({ mobile = false }) => (
    <nav className={`${mobile ? "flex flex-col space-y-2" : "hidden lg:flex lg:space-x-1"}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || 
                        (item.href !== "/" && location.startsWith(item.href));
        
        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "ghost"}
            size={mobile ? "default" : "sm"}
            onClick={() => {
              navigate(item.href);
              if (mobile) setIsMobileMenuOpen(false);
            }}
            className={`${mobile ? "justify-start w-full" : ""} ${
              isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:text-gray-900"
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left section */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden mr-3">
                    <Menu className="h-5 w-5 text-black" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <div className="py-4">
                    <h2 className="text-lg font-semibold mb-4">Navigation</h2>
                    <NavigationMenu mobile={true} />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Logo and title */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    AI Call Assistant
                  </h1>
                </div>
                <div className="hidden sm:block ml-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {getPageTitle()}
                  </h2>
                  {getPageSubtitle() && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getPageSubtitle()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Center navigation (desktop) */}
            <NavigationMenu />

            {/* Right section */}
            <div className="flex items-center space-x-4">
              {/* AI Status */}
              {aiConfig && (
                <div className="hidden sm:flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    AI Active
                  </span>
                </div>
              )}

              {/* Organization Switcher */}
              <OrganizationSwitcher />

              {/* Notifications */}
              <NotificationIcon />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <User className="h-5 w-5 text-black dark:text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notifications")}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/system-settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}