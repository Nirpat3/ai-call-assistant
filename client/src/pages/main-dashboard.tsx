import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Users, 
  Headphones, 
  Settings, 
  MessageSquare,
  Calendar,
  BarChart3,
  Zap,
  FileText,
  Mail,
  Shield,
  Webhook,
  Search,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const apps = [
  {
    id: 'calls',
    name: 'Calls',
    icon: Phone,
    route: '/call-log',
    color: 'bg-green-500',
    description: 'Call History & Management',
    badge: null
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: Users,
    route: '/contacts',
    color: 'bg-indigo-500',
    description: 'Customer Directory',
    badge: null
  },
  {
    id: 'messaging',
    name: 'Messages',
    icon: MessageSquare,
    route: '/sms',
    color: 'bg-green-600',
    description: 'SMS & Text Communications',
    badge: '3'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    route: '/calendar',
    color: 'bg-purple-500',
    description: 'Events & Scheduling',
    badge: null
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    route: '/email',
    color: 'bg-orange-500',
    description: 'Email Management & Automation',
    badge: null
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    route: '/system-settings',
    color: 'bg-gray-600',
    description: 'System Configuration',
    badge: null
  }
];

export default function MainDashboard() {
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* iPad-style Status Bar */}
      <div className="flex justify-between items-center px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{currentTime}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{currentDate}</div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Your AI-powered business communication hub
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Calls Today</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboardStats?.callsToday || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">New Leads</p>
                  <p className="text-2xl font-bold text-green-600">{dashboardStats?.newLeads || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Open Tickets</p>
                  <p className="text-2xl font-bold text-purple-600">{dashboardStats?.openTickets || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Headphones className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">AI Handled</p>
                  <p className="text-2xl font-bold text-indigo-600">{dashboardStats?.aiHandled || 0}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Grid - iPad Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {apps.map((app) => (
            <Link key={app.id} href={app.route}>
              <Card className="group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl bg-white/80 backdrop-blur-sm border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20 relative overflow-hidden">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  {/* App Icon */}
                  <div className={`w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                    <app.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* App Name */}
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {app.name}
                  </h3>
                  
                  {/* App Description */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {app.description}
                  </p>
                  
                  {/* Badge */}
                  {app.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {app.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Incoming Call</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2 minutes ago</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI handled customer inquiry about pricing
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">New Lead</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">15 minutes ago</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Demo scheduled for TechCorp Inc.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-sm border-white/20 dark:bg-gray-800/60 dark:border-gray-700/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Headphones className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Ticket Resolved</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">1 hour ago</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Billing issue resolved automatically
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* iPad-style Dock */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20">
        <div className="flex items-center gap-3">
          <Link href="/call-log">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <Phone className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/contacts">
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <Users className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/sms">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/calendar">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/email">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <Mail className="h-6 w-6 text-white" />
            </div>
          </Link>
          <Link href="/system-settings">
            <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
              <Settings className="h-6 w-6 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}