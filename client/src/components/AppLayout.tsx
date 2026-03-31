import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Home, 
  Phone, 
  Users, 
  Headphones, 
  MessageSquare,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  Bell,
  Search,
  Menu,
  X,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
  appName: string;
  appIcon: React.ComponentType<{ className?: string }>;
  appColor: string;
  tabs?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const quickActions = [
  { href: "/", icon: Home, label: "Home", color: "text-gray-600" },
  { href: "/personal-assistant", icon: Phone, label: "Calls", color: "text-blue-600" },
  { href: "/crm-dashboard", icon: Users, label: "CRM", color: "text-green-600" },
  { href: "/support-department", icon: Headphones, label: "Support", color: "text-purple-600" },
  { href: "/sms", icon: MessageSquare, label: "Messages", color: "text-pink-600" },
];

export default function AppLayout({ 
  children, 
  appName, 
  appIcon: AppIcon, 
  appColor, 
  tabs = [], 
  activeTab, 
  onTabChange 
}: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  // Get current time for status bar
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", appColor)}>
                  <AppIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{appName}</h1>
                  <p className="text-sm text-gray-500">{currentTime}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="p-2">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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

        {/* App Tabs */}
        {tabs.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                      isActive 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation Dock */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            const isActive = location === action.href;
            return (
              <Link key={action.href} href={action.href}>
                <div className="flex flex-col items-center gap-1 p-2">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-blue-100" : "hover:bg-gray-100"
                  )}>
                    <ActionIcon className={cn(
                      "h-5 w-5",
                      isActive ? "text-blue-600" : action.color
                    )} />
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-blue-600" : "text-gray-600"
                  )}>
                    {action.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom padding to account for dock */}
      <div className="h-20"></div>
    </div>
  );
}