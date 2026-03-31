import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Menu,
  X,
  Home, 
  Phone, 
  Bell, 
  Voicemail, 
  Settings, 
  Brain,
  Users,
  BarChart3,
  Zap,
  Route,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: 'active' | 'beta' | 'coming-soon';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const menuSections: MenuSection[] = [
    {
      title: "Core Features",
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: Home,
          description: "Real-time overview and quick actions",
          status: "active"
        },
        {
          name: "Call Log",
          href: "/call-log",
          icon: Phone,
          description: "Complete call history and analytics",
          status: "active"
        },
        {
          name: "Voicemail",
          href: "/voicemail",
          icon: Voicemail,
          description: "AI-transcribed voicemail management",
          status: "active"
        },
        {
          name: "Notifications",
          href: "/notifications",
          icon: Bell,
          description: "Smart alerts and system updates",
          status: "active"
        }
      ]
    },
    {
      title: "AI & Intelligence",
      items: [
        {
          name: "AI Management",
          href: "/ai-management",
          icon: Brain,
          description: "Smart notifications and call routing",
          status: "active"
        },
        {
          name: "Quick Setup",
          href: "/quick-setup",
          icon: Zap,
          description: "Rapid AI assistant configuration",
          status: "active"
        },
        {
          name: "Analytics",
          href: "/analytics",
          icon: BarChart3,
          description: "Performance insights and reporting",
          status: "beta"
        },
        {
          name: "Contact Management",
          href: "/contacts",
          icon: Users,
          description: "Centralized contact database",
          status: "beta"
        }
      ]
    },
    {
      title: "Setup & Support",
      items: [
        {
          name: "System Settings",
          href: "/system-settings",
          icon: Settings,
          description: "Configuration and preferences",
          status: "active"
        },
        {
          name: "Onboarding",
          href: "/onboarding",
          icon: Route,
          description: "Guided setup for new users",
          status: "active"
        },
        {
          name: "Call Forwarding Setup",
          href: "/call-forwarding-setup",
          icon: Settings,
          description: "Manage call routing and carrier setup",
          status: "active"
        },
        {
          name: "AI Assistant Config",
          href: "/ai-assistant-config",
          icon: Brain,
          description: "Customize AI behavior and voice settings",
          status: "active"
        },
        {
          name: "Webhook Management",
          href: "/webhook-management",
          icon: ExternalLink,
          description: "Connect with n8n, Zendesk, and third-party systems",
          status: "active"
        },
        {
          name: "Site Map",
          href: "/sitemap",
          icon: Route,
          description: "Complete navigation guide",
          status: "active"
        },
        {
          name: "User Guide",
          href: "/user-guide",
          icon: Route,
          description: "Documentation and tutorials",
          status: "coming-soon"
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'beta': return 'bg-blue-100 text-blue-800';
      case 'coming-soon': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Live';
      case 'beta': return 'Beta';
      case 'coming-soon': return 'Soon';
      default: return '';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="rounded-xl border-gray-300 hover:border-gray-400"
      >
        {isOpen ? (
          <X className="w-4 h-4" />
        ) : (
          <Menu className="w-4 h-4" />
        )}
        <span className="ml-2 hidden md:inline">Menu</span>
      </Button>

      {/* Mega Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Content */}
          <div className="absolute top-full left-0 mt-2 w-screen max-w-4xl z-50">
            <Card className="border-0 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Call Assistant</h2>
                    <p className="text-gray-600">Navigate to any section</p>
                  </div>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Current Page Indicator */}
                <div className="mb-6 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    Currently viewing: <span className="text-blue-900">{location}</span>
                  </p>
                </div>

                {/* Menu Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {menuSections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                        {section.title}
                      </h3>
                      <div className="space-y-3">
                        {section.items.map((item, itemIndex) => {
                          const IconComponent = item.icon;
                          const isCurrentPage = location === item.href;
                          
                          return (
                            <div key={itemIndex}>
                              {item.status === 'active' ? (
                                <Link href={item.href}>
                                  <div 
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                      isCurrentPage 
                                        ? 'bg-blue-100 border border-blue-300' 
                                        : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <div className={`p-2 rounded-lg ${
                                      isCurrentPage ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}>
                                      <IconComponent className={`w-4 h-4 ${
                                        isCurrentPage ? 'text-white' : 'text-gray-600'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-medium ${
                                          isCurrentPage ? 'text-blue-900' : 'text-gray-900'
                                        }`}>
                                          {item.name}
                                        </h4>
                                        <Badge className={getStatusColor(item.status) + " text-xs"}>
                                          {getStatusLabel(item.status)}
                                        </Badge>
                                        {isCurrentPage && (
                                          <Badge className="bg-blue-600 text-white text-xs">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                        {item.description}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 mt-2" />
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 opacity-75">
                                  <div className="p-2 bg-gray-200 rounded-lg">
                                    <IconComponent className="w-4 h-4 text-gray-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-700">{item.name}</h4>
                                      <Badge className={getStatusColor(item.status) + " text-xs"}>
                                        {getStatusLabel(item.status)}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                      {item.description}
                                    </p>
                                  </div>
                                  <Clock className="w-4 h-4 text-gray-400 mt-2" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <Link href="/sitemap">
                        <Button 
                          onClick={() => setIsOpen(false)}
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl"
                        >
                          <Route className="w-4 h-4 mr-2" />
                          Full Site Map
                        </Button>
                      </Link>
                      <Link href="/quick-setup">
                        <Button 
                          onClick={() => setIsOpen(false)}
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Quick Setup
                        </Button>
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500">
                      {menuSections.reduce((total, section) => total + section.items.filter(item => item.status === 'active').length, 0)} pages available
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}