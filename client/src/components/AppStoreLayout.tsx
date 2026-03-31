import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Menu, Bell, Settings, User, LogOut, Home, Phone, Brain, Users, 
  BarChart3, Clock, Bot, Search, ChevronRight, Sparkles, Puzzle, UserCheck, 
  PhoneForwarded, Zap, ExternalLink, MessageSquare, Activity, Target, 
  Shield, FileText, MapPin, Smartphone, Headphones, Cog, HelpCircle, DollarSign,
  Calendar, Mail, Voicemail, ListTodo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import OrganizationSelector from "@/components/dashboard/OrganizationSelector";
import NotificationIcon from "@/components/NotificationIcon";
import SupportChatbot from "@/components/SupportChatbot";
import { useAuth } from "@/hooks/useAuth";

interface AppStoreLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppStoreLayout({ children, title, subtitle }: AppStoreLayoutProps) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAIHelp, setShowAIHelp] = useState(false);
  const { logout } = useAuth();

  // Listen for AI Help events from the navigation
  useEffect(() => {
    const handleShowAIHelp = () => {
      setShowAIHelp(true);
    };
    
    window.addEventListener('show-ai-help', handleShowAIHelp);
    return () => window.removeEventListener('show-ai-help', handleShowAIHelp);
  }, []);

  const { data: aiConfig } = useQuery<any>({
    queryKey: ["/api/ai-config"],
  });

  const navigationItems = [
    // Main Navigation Items
    { 
      href: "/", 
      icon: Home, 
      label: "Dashboard", 
      subtitle: "Overview & Quick Actions",
      color: "bg-blue-500"
    },
    { 
      href: "/call-log", 
      icon: Phone, 
      label: "Calls", 
      subtitle: "Call History & Management",
      color: "bg-green-500"
    },
    { 
      href: "/voicemail", 
      icon: Voicemail, 
      label: "Voicemail", 
      subtitle: "Voice Messages",
      color: "bg-purple-500"
    },
    { 
      href: "/contacts", 
      icon: Users, 
      label: "Contacts", 
      subtitle: "Customer Directory",
      color: "bg-indigo-500"
    },
    { 
      href: "/sms", 
      icon: MessageSquare, 
      label: "Messages", 
      subtitle: "SMS & Text Communications",
      color: "bg-green-600"
    },
    { 
      href: "/calendar", 
      icon: Calendar, 
      label: "Calendar", 
      subtitle: "Events & Scheduling",
      color: "bg-purple-500"
    },
    { 
      href: "/email", 
      icon: Mail, 
      label: "Email", 
      subtitle: "Email Management & Automation",
      color: "bg-orange-500"
    },
    { 
      href: "/todo", 
      icon: ListTodo, 
      label: "Todo", 
      subtitle: "Tasks & Reminders",
      color: "bg-blue-600"
    },
    
    // Settings - Everything else goes here
    { 
      href: "/system-settings", 
      icon: Settings, 
      label: "Settings", 
      subtitle: "System Configuration",
      color: "bg-gray-600",
      isCategory: true,
      children: [
        { 
          href: "/notifications", 
          icon: Bell, 
          label: "Notifications", 
          subtitle: "System Alerts & Updates",
          color: "bg-orange-500"
        },
        { 
          href: "/ai-management", 
          icon: Brain, 
          label: "AI Management", 
          subtitle: "Smart Rules & Routing",
          color: "bg-pink-500"
        },
        { 
          href: "/conversation-analytics", 
          icon: BarChart3, 
          label: "Analytics", 
          subtitle: "Conversation Insights",
          color: "bg-blue-600"
        },
        { 
          href: "/call-settings", 
          icon: Phone, 
          label: "Call Settings", 
          subtitle: "Call Configuration",
          color: "bg-blue-500"
        },
        { 
          href: "/ai-receptionist", 
          icon: Bot, 
          label: "AI Receptionist", 
          subtitle: "Configure AI Assistant",
          color: "bg-purple-500"
        },
        { 
          href: "/call-routing", 
          icon: Target, 
          label: "Call Routing", 
          subtitle: "Smart Call Distribution",
          color: "bg-purple-600"
        },
        { 
          href: "/integrations", 
          icon: Puzzle, 
          label: "Integrations", 
          subtitle: "Third-party Services",
          color: "bg-emerald-600"
        },
        { 
          href: "/live-calls", 
          icon: Activity, 
          label: "Live Calls", 
          subtitle: "Real-time Call Monitoring",
          color: "bg-red-600"
        },
        { 
          href: "/intent-recognition", 
          icon: Brain, 
          label: "Intent Recognition", 
          subtitle: "AI Pattern Detection",
          color: "bg-pink-600"
        },
        { 
          href: "/onboarding", 
          icon: Sparkles, 
          label: "Setup Wizard", 
          subtitle: "Complete Platform Setup",
          color: "bg-cyan-500"
        },
        { 
          href: "/quick-setup", 
          icon: Zap, 
          label: "Quick Setup", 
          subtitle: "Fast Configuration",
          color: "bg-cyan-600"
        }
      ]
    }
  ];

  const getPageTitle = () => {
    if (title) return title;
    
    const currentItem = navigationItems.find(item => item.href === location);
    if (currentItem) return currentItem.label;
    
    if (location === "/") return "Today";
    if (location.startsWith("/contacts/")) return "Contact Profile";
    if (location.includes("analytics")) return "Analytics";
    if (location.includes("settings")) return "Settings";
    
    return "AI Call Assistant";
  };

  const getPageSubtitle = () => {
    if (subtitle) return subtitle;
    
    const currentItem = navigationItems.find(item => item.href === location);
    if (currentItem) return currentItem.subtitle;
    
    return "";
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className={`sidebar-content h-full flex flex-col ${mobile ? "p-3 bg-white" : "p-4 backdrop-blur-xl"}`}
         style={mobile ? {} : {
           background: 'rgba(255, 255, 255, 0.05)',
           backdropFilter: 'blur(20px)',
           WebkitBackdropFilter: 'blur(20px)',
           borderRight: '1px solid rgba(255, 255, 255, 0.1)'
         }}>
      {/* Logo Section with Glass Effect */}
      <div className={`flex items-center space-x-3 ${mobile ? "mb-4" : "mb-6"} p-3 rounded-2xl`} 
           style={mobile ? {
             background: '#f8f9fa',
             border: '1px solid #e9ecef',
             boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
           } : {
             background: 'rgba(255, 255, 255, 0.08)',
             backdropFilter: 'blur(10px)',
             WebkitBackdropFilter: 'blur(10px)',
             border: '1px solid rgba(255, 255, 255, 0.12)',
             boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
           }}>
        <div className={`${mobile ? "w-10 h-10" : "w-12 h-12"} bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg`}>
          <Sparkles className={`${mobile ? "w-5 h-5" : "w-7 h-7"} text-white`} />
        </div>
        <div>
          <h1 className={`${mobile ? "text-base text-gray-900" : "text-lg text-foreground"} font-semibold`}>AI Assistant</h1>
          <p className={`text-xs ${mobile ? "text-gray-600" : "text-muted-foreground"}`}>Call Management</p>
        </div>
      </div>

      {/* Glass Search Bar */}
      {!mobile && (
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="input-standard pl-12 h-10"
          />
        </div>
      )}

      {/* Navigation with expandable Settings */}
      <nav className="sidebar-nav flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
                          (item.href !== "/" && location.startsWith(item.href));
          
          // For Settings category, check if any child is active
          const hasActiveChild = item.children?.some(child => 
            location === child.href || (child.href !== "/" && location.startsWith(child.href))
          );
          const isSettingsActive = isActive || hasActiveChild;
          
          return (
            <div key={item.href}>
              <button
                onClick={() => {
                  if (!item.children) {
                    navigate(item.href);
                    if (mobile) setIsMobileMenuOpen(false);
                  }
                }}
                className={`w-full ${isSettingsActive ? 'nav-item-active' : 'nav-item'} ${mobile ? "p-3" : "p-4"}`}
              >
                <div className={`${mobile ? "w-8 h-8" : "w-10 h-10"} ${item.color} rounded-2xl flex items-center justify-center shadow-lg`}
                     style={{
                       boxShadow: isSettingsActive ? '0 6px 20px rgba(0, 122, 255, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
                     }}>
                  <Icon className={`${mobile ? "w-4 h-4" : "w-5 h-5"} text-white`} />
                </div>
                <div className="flex-1 text-left">
                  <div className={`${mobile ? "text-sm text-gray-900" : "text-sm"} font-medium`}>{item.label}</div>
                  {!mobile && (
                    <div className="text-xs text-gray-500">{item.subtitle}</div>
                  )}
                  {mobile && (
                    <div className="text-xs text-gray-600">{item.subtitle}</div>
                  )}
                </div>
                {isActive && !item.children && (
                  <ChevronRight className={`${mobile ? "w-4 h-4" : "w-4 h-4"} text-blue-600`} />
                )}
              </button>
              
              {/* Settings children - always expanded */}
              {item.children && (
                <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = location === child.href || 
                                        (child.href !== "/" && location.startsWith(child.href));
                    
                    return (
                      <button
                        key={child.href}
                        onClick={() => {
                          navigate(child.href);
                          if (mobile) setIsMobileMenuOpen(false);
                        }}
                        className={`w-full ${isChildActive ? 'nav-item-active' : 'nav-item'} ${mobile ? "p-2" : "p-3"} text-sm`}
                      >
                        <div className={`${mobile ? "w-6 h-6" : "w-8 h-8"} ${child.color} rounded-xl flex items-center justify-center shadow-md`}
                             style={{
                               boxShadow: isChildActive ? '0 4px 16px rgba(0, 122, 255, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                             }}>
                          <ChildIcon className={`${mobile ? "w-3 h-3" : "w-4 h-4"} text-white`} />
                        </div>
                        <div className="flex-1 text-left ml-2">
                          <div className={`${mobile ? "text-xs text-gray-900" : "text-xs"} font-medium`}>{child.label}</div>
                          {!mobile && (
                            <div className="text-xs text-gray-500 leading-tight">{child.subtitle}</div>
                          )}
                        </div>
                        {isChildActive && (
                          <ChevronRight className={`${mobile ? "w-3 h-3" : "w-3 h-3"} text-blue-600`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* AI Status Card - Bottom spacing improved */}
      {aiConfig && !mobile && (
        <div className="mt-4 mb-4 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">AI Agent Active</span>
          </div>
          <p className="text-xs text-green-600">Ready to handle incoming calls</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" 
         style={{
           background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
           minHeight: '100vh'
         }}>
      {/* Top Navigation for Mobile */}
      <div className="md:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left - Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50" style={{zIndex: 9999}}>
                <SidebarContent mobile={true} />
              </SheetContent>
            </Sheet>

            {/* Center - Page Title */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center space-x-2">
              {/* AI Help */}
              <button 
                onClick={() => setShowAIHelp(true)}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                <Sparkles className="h-5 w-5" />
              </button>
              
              {/* Notifications */}
              <NotificationIcon />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <OrganizationSelector />
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
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:block md:w-72 md:overflow-y-auto"
           style={{
             background: 'rgba(255, 255, 255, 0.05)',
             backdropFilter: 'blur(20px)',
             WebkitBackdropFilter: 'blur(20px)',
             borderRight: '1px solid rgba(255, 255, 255, 0.1)'
           }}>
        <SidebarContent />
      </div>



      {/* Desktop Header - Hidden on mobile */}
      <div className="hidden md:block md:pl-72">
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 px-6 sm:gap-x-8 sm:px-8"
             style={{
               background: 'rgba(255, 255, 255, 0.8)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
               boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
             }}>
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground page-title">{getPageTitle()}</h1>
              {getPageSubtitle() && (
                <p className="text-sm text-muted-foreground mt-1">{getPageSubtitle()}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* AI Status with Glass Effect */}
              {aiConfig && (
                <div className="status-success flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">AI Active</span>
                </div>
              )}

              {/* AI Help Bot - Prominent Position */}
              <button 
                onClick={() => setShowAIHelp(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold hidden md:inline">AI Help</span>
              </button>

              {/* Notifications */}
              <NotificationIcon />

              {/* User menu with Glass Effect */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="btn-outline relative">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-modal">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Organization Selection in Profile Menu */}
                  <OrganizationSelector />
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
      </div>

      {/* Main content with responsive layout */}
      <main className="md:pl-72 w-full overflow-x-hidden">
        <div className="pt-16 md:pt-20 min-h-screen">
          <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 w-full max-w-7xl mx-auto">
            <div className="w-full overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* AI Help Bot Modal */}
      {showAIHelp && (
        <SupportChatbot onClose={() => setShowAIHelp(false)} />
      )}
    </div>
  );
}