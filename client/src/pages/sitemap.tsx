import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Phone, 
  Bell, 
  Voicemail, 
  Settings, 
  Brain,
  Users,
  BarChart3,
  Shield,
  Zap,
  Clock,
  Route,
  FileText,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import AppStoreLayout from "@/components/AppStoreLayout";

interface SiteSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  pages: {
    name: string;
    path: string;
    description: string;
    status: 'active' | 'beta' | 'coming-soon';
  }[];
}

export default function SitemapPage() {
  const siteStructure: SiteSection[] = [
    {
      title: "Core Dashboard",
      description: "Main application interface and overview",
      icon: Home,
      pages: [
        {
          name: "Dashboard",
          path: "/",
          description: "Real-time call statistics, AI performance metrics, and quick actions",
          status: "active"
        },
        {
          name: "Quick Setup",
          path: "/quick-setup",
          description: "Rapid configuration for essential AI assistant features",
          status: "active"
        },
        {
          name: "Onboarding",
          path: "/onboarding",
          description: "Step-by-step guided setup for new users",
          status: "active"
        }
      ]
    },
    {
      title: "Call Management",
      description: "Call handling, routing, and communication features",
      icon: Phone,
      pages: [
        {
          name: "Call Log",
          path: "/call-log",
          description: "Complete history of all incoming and outgoing calls with detailed analytics",
          status: "active"
        },
        {
          name: "Voicemail",
          path: "/voicemail",
          description: "AI-transcribed voicemails with summaries and playback controls",
          status: "active"
        },
        {
          name: "Live Calls",
          path: "/live-calls",
          description: "Real-time monitoring of active calls and agent status",
          status: "active"
        }
      ]
    },
    {
      title: "AI & Intelligence",
      description: "Advanced AI features and intelligent automation",
      icon: Brain,
      pages: [
        {
          name: "AI Management",
          path: "/ai-management",
          description: "Smart notifications, call routing rules, and agent performance",
          status: "active"
        },
        {
          name: "Conversation Analytics",
          path: "/conversation-analytics",
          description: "AI-powered analysis of call content and customer sentiment",
          status: "active"
        },
        {
          name: "Intent Recognition",
          path: "/intent-recognition",
          description: "Configure and train AI to understand caller intentions",
          status: "active"
        }
      ]
    },
    {
      title: "Notifications & Alerts",
      description: "Smart notification system and alert management",
      icon: Bell,
      pages: [
        {
          name: "Notifications",
          path: "/notifications",
          description: "All system notifications, alerts, and important updates",
          status: "active"
        },
        {
          name: "Alert Rules",
          path: "/alert-rules",
          description: "Custom notification rules based on call priority and context",
          status: "active"
        },
        {
          name: "Escalation Policies",
          path: "/escalation-policies",
          description: "Automated escalation workflows for critical situations",
          status: "active"
        }
      ]
    },
    {
      title: "Contacts & Routing",
      description: "Contact management and intelligent call routing",
      icon: Users,
      pages: [
        {
          name: "Contact Management",
          path: "/contacts",
          description: "Centralized contact database with VIP settings and call preferences",
          status: "active"
        },
        {
          name: "Duplicate Detection",
          path: "/contact-duplicates",
          description: "AI-powered contact duplicate detection with intelligent merge suggestions",
          status: "active"
        },
        {
          name: "Call Routing",
          path: "/call-routing",
          description: "Advanced routing rules based on time, caller, and business logic",
          status: "active"
        },
        {
          name: "Team Directory",
          path: "/team-directory",
          description: "Internal team contacts and availability management",
          status: "active"
        }
      ]
    },
    {
      title: "Analytics & Reports",
      description: "Business intelligence and performance analytics",
      icon: BarChart3,
      pages: [
        {
          name: "Call Analytics",
          path: "/call-analytics",
          description: "Detailed reports on call volume, duration, and success rates",
          status: "active"
        },
        {
          name: "AI Performance",
          path: "/ai-performance",
          description: "AI accuracy metrics, learning progress, and optimization insights",
          status: "active"
        },
        {
          name: "Business Intelligence",
          path: "/business-intelligence",
          description: "Executive dashboards with key performance indicators",
          status: "active"
        }
      ]
    },
    {
      title: "Settings & Configuration",
      description: "System settings and administrative controls",
      icon: Settings,
      pages: [
        {
          name: "System Settings",
          path: "/system-settings",
          description: "AI configuration, business hours, and system preferences",
          status: "active"
        },
        {
          name: "Integration Settings",
          path: "/integration-settings",
          description: "Third-party integrations including Slack, email, and webhooks",
          status: "active"
        },
        {
          name: "Security Settings",
          path: "/security-settings",
          description: "User permissions, API keys, and security configurations",
          status: "active"
        }
      ]
    },
    {
      title: "Help & Support",
      description: "Documentation, guides, and support resources",
      icon: HelpCircle,
      pages: [
        {
          name: "Site Map",
          path: "/sitemap",
          description: "Complete navigation guide to all application features",
          status: "active"
        },
        {
          name: "User Guide",
          path: "/user-guide",
          description: "Comprehensive documentation and feature explanations",
          status: "active"
        },
        {
          name: "API Documentation",
          path: "/api-docs",
          description: "Developer resources and API integration guides",
          status: "active"
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
      case 'coming-soon': return 'Coming Soon';
      default: return 'Unknown';
    }
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg">
                  <Route className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Site Map</h1>
                  <p className="text-gray-600 mt-1 text-lg">
                    Complete navigation guide to all AI Call Assistant features
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {siteStructure.reduce((total, section) => total + section.pages.length, 0)}
                </div>
                <p className="text-sm text-gray-600">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {siteStructure.reduce((total, section) => 
                  total + section.pages.filter(p => p.status === 'active').length, 0)}
              </div>
              <p className="text-sm text-gray-600">Active Pages</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {siteStructure.reduce((total, section) => 
                  total + section.pages.filter(p => p.status === 'beta').length, 0)}
              </div>
              <p className="text-sm text-gray-600">Beta Features</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {siteStructure.reduce((total, section) => 
                  total + section.pages.filter(p => p.status === 'coming-soon').length, 0)}
              </div>
              <p className="text-sm text-gray-600">Coming Soon</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{siteStructure.length}</div>
              <p className="text-sm text-gray-600">Sections</p>
            </CardContent>
          </Card>
        </div>

        {/* Site Structure */}
        <div className="space-y-6">
          {siteStructure.map((section, sectionIndex) => {
            const IconComponent = section.icon;
            return (
              <Card key={sectionIndex} className="border rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl">
                      <IconComponent className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                      <p className="text-sm text-gray-600 font-normal">{section.description}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4">
                    {section.pages.map((page, pageIndex) => (
                      <div key={pageIndex} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {page.status === 'active' ? (
                              <Link href={page.path}>
                                <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer flex items-center gap-1">
                                  {page.name}
                                  <ExternalLink className="w-3 h-3" />
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="font-semibold text-gray-900">{page.name}</h3>
                            )}
                            <Badge className={getStatusColor(page.status) + " text-xs"}>
                              {getStatusLabel(page.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {page.description}
                          </p>
                          {page.status === 'active' && (
                            <p className="text-xs text-blue-600 mt-1">
                              Path: {page.path}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          {page.status === 'active' ? (
                            <Link href={page.path}>
                              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </div>
                            </Link>
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center">
                              <Clock className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation Tips */}
        <Card className="bg-blue-50 border-blue-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-600 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Navigation Tips</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Use the top navigation menu to access main sections quickly</li>
                  <li>• Dashboard provides quick actions for common tasks</li>
                  <li>• Beta features are fully functional but may receive updates</li>
                  <li>• Coming Soon features are planned for future releases</li>
                  <li>• All active pages are accessible via direct links above</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppStoreLayout>
  );
}