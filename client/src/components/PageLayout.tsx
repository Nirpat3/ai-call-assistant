import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Home, 
  Phone, 
  Users, 
  Headphones, 
  MessageSquare,
  Bell,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  showBackButton?: boolean;
}

const quickActions = [
  { href: "/", icon: Home, label: "Home", color: "text-gray-600" },
  { href: "/personal-assistant", icon: Phone, label: "Calls", color: "text-blue-600" },
  { href: "/crm-dashboard", icon: Users, label: "CRM", color: "text-green-600" },
  { href: "/support-department", icon: Headphones, label: "Support", color: "text-purple-600" },
  { href: "/sms", icon: MessageSquare, label: "Messages", color: "text-pink-600" },
];

export default function PageLayout({ 
  children, 
  title, 
  description,
  icon: Icon,
  showBackButton = true
}: PageLayoutProps) {
  const [location] = useLocation();

  // Get current time for status bar
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Link href="/">
                  <Button variant="ghost" size="sm" className="p-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="p-2 rounded-xl bg-blue-500">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                  {description && <p className="text-sm text-gray-500">{description}</p>}
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
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4">
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