import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Phone, Voicemail, Bot, Users, BarChart3, ArrowRight, Settings, Router } from "lucide-react";

export default function QuickActions() {
  const [, navigate] = useLocation();
  
  const { data: notificationStatus } = useQuery({
    queryKey: ["/api/notifications/status"],
    refetchInterval: 60000, // Refresh every minute
  });

  const quickActions = [
    {
      id: "calls",
      icon: Phone,
      label: "View Call Log",
      description: "Check recent calls & activity",
      color: "bg-blue-100 text-blue-600",
      href: "/call-log"
    },
    {
      id: "voicemail",
      icon: Voicemail,
      label: "Voicemail Inbox",
      description: "Listen to voice messages",
      color: "bg-purple-100 text-purple-600",
      href: "/voicemail"
    },
    {
      id: "call-routing",
      icon: Router,
      label: "Call Routing",
      description: "Configure call routing & departments",
      color: "bg-indigo-100 text-indigo-600",
      href: "/call-settings"
    },
    {
      id: "ai-config",
      icon: Bot,
      label: "AI Configuration",
      description: "Setup AI agent responses",
      color: "bg-orange-100 text-orange-600",
      href: "/settings/call-management"
    },
    {
      id: "contacts",
      icon: Users,
      label: "Manage Contacts",
      description: "Customer directory",
      color: "bg-green-100 text-green-600",
      href: "/contacts"
    },
    {
      id: "analytics",
      icon: BarChart3,
      label: "Call Analytics",
      description: "Performance metrics",
      color: "bg-teal-100 text-teal-600",
      href: "/analytics/calls"
    },
    {
      id: "settings",
      icon: Settings,
      label: "System Settings",
      description: "Configure preferences",
      color: "bg-gray-100 text-gray-600",
      href: "/timezone-settings"
    }
  ];

  const handleQuickAction = (href: string) => {
    navigate(href);
  };

  const getChannelStatus = (channel: string) => {
    const isActive = notificationStatus?.[channel as keyof typeof notificationStatus];
    return {
      color: isActive ? "bg-accent" : "bg-gray-300",
      text: isActive ? "Active" : "Inactive"
    };
  };

  const notificationChannels = [
    { id: "sms", icon: "fas fa-sms", label: "SMS", color: "text-blue-600" },
    { id: "email", icon: "fas fa-envelope", label: "Email", color: "text-red-600" },
    { id: "whatsapp", icon: "fab fa-whatsapp", label: "WhatsApp", color: "text-green-600" },
    { id: "telegram", icon: "fab fa-telegram", label: "Telegram", color: "text-blue-500" }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Navigation</h3>
          <span className="text-sm text-gray-500">Access key features</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Card
                key={action.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
                onClick={() => handleQuickAction(action.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.label}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Notification Channels Card */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationChannels.map((channel) => {
            const status = getChannelStatus(channel.id);
            return (
              <div key={channel.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <i className={`${channel.icon} ${channel.color}`}></i>
                  <span className="text-sm font-medium text-gray-900">{channel.label}</span>
                </div>
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${status.color}`}></span>
                  <span className="text-sm text-gray-600">{status.text}</span>
                </div>
              </div>
            );
          })}
          
          <Button 
            className="w-full mt-4"
            onClick={() => handleQuickAction("Notification Settings")}
          >
            Manage Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
