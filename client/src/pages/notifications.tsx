import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Phone, Voicemail, Settings, Check, Trash2, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import AppStoreLayout from "@/components/AppStoreLayout";

interface Notification {
  id: number;
  type: 'call' | 'voicemail' | 'system' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  relatedId?: number;
  actionUrl?: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'call':
      return <Phone className="w-4 h-4 text-blue-600" />;
    case 'voicemail':
      return <Voicemail className="w-4 h-4 text-purple-600" />;
    case 'system':
      return <Settings className="w-4 h-4 text-gray-600" />;
    case 'alert':
      return <Bell className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600" />;
  }
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  return (
    <Badge className={`${colors[priority as keyof typeof colors]} text-xs`}>
      {priority.toUpperCase()}
    </Badge>
  );
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'call' | 'voicemail'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/mark-all-read", {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notifications Updated",
        description: "All notifications marked as read."
      });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notification Deleted",
        description: "Notification has been removed."
      });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/clear-all", {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notifications Cleared",
        description: "All notifications have been removed."
      });
    }
  });

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'call') return notification.type === 'call';
    if (filter === 'voicemail') return notification.type === 'voicemail';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  if (isLoading) {
    return (
      <AppStoreLayout>
        <div className="section-spacing">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-blue-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg">Stay updated with your AI assistant activity</p>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2 animate-pulse rounded-xl">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={() => markAllReadMutation.mutate()}
                  variant="default"
                  size={`lg`}
                  disabled={unreadCount === 0 || markAllReadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-3 sm:px-6 text-sm"
                >
                  <Check className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">Read All</span>
                </Button>
                <Button
                  onClick={() => clearAllMutation.mutate()}
                  variant="outline"
                  size={`lg`}
                  disabled={notifications.length === 0 || clearAllMutation.isPending}
                  className="text-red-600 border-red-300 hover:bg-red-50 rounded-xl px-3 sm:px-6 text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced iOS 16 Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-6">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-gray-100 rounded-2xl p-1 h-auto sm:h-14 gap-1 sm:gap-0">
                <TabsTrigger 
                  value="all" 
                  className="flex items-center gap-1 sm:gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-10 sm:h-12 text-xs sm:text-sm font-medium"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">All ({notifications.length})</span>
                  <span className="sm:hidden">All</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="unread" 
                  className="flex items-center gap-1 sm:gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-10 sm:h-12 text-xs sm:text-sm font-medium"
                >
                  <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Unread ({unreadCount})</span>
                  <span className="sm:hidden">Unread</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="call" 
                  className="flex items-center gap-1 sm:gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-10 sm:h-12 text-xs sm:text-sm font-medium"
                >
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Calls ({notifications.filter(n => n.type === 'call').length})</span>
                  <span className="sm:hidden">Calls</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="voicemail" 
                  className="flex items-center gap-1 sm:gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm h-10 sm:h-12 text-xs sm:text-sm font-medium"
                >
                  <Voicemail className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Voicemails ({notifications.filter(n => n.type === 'voicemail').length})</span>
                  <span className="sm:hidden">VM</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-6 mt-6">
                <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-12 text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Bell className="w-10 h-10 text-gray-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
                          <p className="text-gray-600 max-w-md mx-auto">
                            {filter === 'all' 
                              ? "You're all caught up! No notifications to show."
                              : `No ${filter} notifications found.`
                            }
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                filteredNotifications.map((notification) => {
                  const getNotificationColors = (type: string, isRead: boolean) => {
                    if (isRead) return 'bg-white border-gray-200 shadow-sm';
                    const colors = {
                      call: 'bg-green-50 border-green-200 border-l-4 border-l-green-500 shadow-md',
                      voicemail: 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-md',
                      system: 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-500 shadow-md',
                      alert: 'bg-red-50 border-red-200 border-l-4 border-l-red-500 shadow-md',
                      sms: 'bg-purple-50 border-purple-200 border-l-4 border-l-purple-500 shadow-md'
                    };
                    return colors[type as keyof typeof colors] || colors.system;
                  };

                  const getIconBackground = (type: string, isRead: boolean) => {
                    if (isRead) return 'bg-gray-100';
                    const backgrounds = {
                      call: 'bg-green-100',
                      voicemail: 'bg-blue-100', 
                      system: 'bg-gray-100',
                      alert: 'bg-red-100',
                      sms: 'bg-purple-100'
                    };
                    return backgrounds[type as keyof typeof backgrounds] || backgrounds.system;
                  };

                  return (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md border rounded-2xl ${getNotificationColors(notification.type, notification.isRead)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col space-y-3 sm:space-y-4">
                          <div className="flex items-start space-x-3 sm:space-x-4">
                            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${getIconBackground(notification.type, notification.isRead)}`}>
                              <NotificationIcon type={notification.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <h4 className={`text-base sm:text-lg font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </h4>
                                <PriorityBadge priority={notification.priority} />
                                {!notification.isRead && (
                                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                )}
                              </div>
                              <p className={`text-sm sm:text-base ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'} mb-3 leading-relaxed`}>
                                {notification.message}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3">
                                <span className="font-medium">{format(new Date(notification.createdAt), 'MMM d, yyyy')}</span>
                                <span>{format(new Date(notification.createdAt), 'h:mm a')}</span>
                                <span className="text-xs">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center space-x-2 sm:space-x-3 pt-2 border-t border-gray-200">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              disabled={markAsReadMutation.isPending}
                              className="flex-1 hover:bg-green-50 hover:border-green-300 rounded-xl text-xs sm:text-sm"
                            >
                              <span className="hidden sm:inline">{notification.isRead ? 'Read' : 'Mark Read'}</span>
                              <span className="sm:hidden">{notification.isRead ? 'Read' : 'Read'}</span>
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(notification.id);
                              }}
                              disabled={deleteNotificationMutation.isPending}
                              className="text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl px-3 sm:px-4"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })
                    )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppStoreLayout>
  );
}