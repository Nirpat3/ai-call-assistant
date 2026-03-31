import { Phone, Voicemail, Users, Menu, Home, Settings, BarChart3, Bell, User, MessageCircle, MessageSquare, Router, Calendar, Mail, ListTodo } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Calls', path: '/call-log', icon: Phone },
  { label: 'Contacts', path: '/contacts', icon: Users },
  { label: 'Messages', path: '/sms', icon: MessageSquare },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Email', path: '/email', icon: Mail },
  { label: 'Todo', path: '/todo', icon: ListTodo },
];

const fullMenuItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Calls', path: '/call-log', icon: Phone },
  { label: 'Contacts', path: '/contacts', icon: Users },
  { label: 'Messages', path: '/sms', icon: MessageSquare },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Email', path: '/email', icon: Mail },
  { label: 'Todo', path: '/todo', icon: ListTodo },
  { label: 'Settings', path: '/system-settings', icon: Settings },
];

export function FooterNavigation() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Main Top Navigation Bar - Full Width */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/60 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Left Side - Primary Navigation */}
              <div className="flex items-center space-x-1 md:space-x-4">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => setLocation(item.path)}
                      className={`flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all duration-200 ${
                        active 
                          ? 'bg-blue-100/90 text-blue-600 shadow-lg scale-105' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {item.badge && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                            {item.badge}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Side - User Actions */}
              <div className="flex items-center space-x-2">
                
                {/* AI Help Bot - Prominent Position */}
                <button 
                  onClick={() => {
                    // We'll import and show the SupportChatbot component
                    const event = new CustomEvent('show-ai-help');
                    window.dispatchEvent(event);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold hidden md:inline">AI Help</span>
                </button>
                
                {/* Notifications */}
                <button className="p-2 rounded-xl transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 relative">
                  <Bell className="h-5 w-5" />
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    3
                  </div>
                </button>
                
                {/* User Profile */}
                <button className="p-2 rounded-xl transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50">
                  <User className="h-5 w-5" />
                </button>

                {/* Full Menu Button */}
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <button className="flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50">
                      <Menu className="h-5 w-5" />
                      <span className="text-sm font-semibold hidden md:inline">Menu</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="top" className="h-[80vh] bg-white/95 backdrop-blur-xl border-b border-gray-200/60">
                    <SheetHeader className="pb-6">
                      <SheetTitle className="text-2xl font-bold text-gray-900">All Apps</SheetTitle>
                      <SheetDescription className="text-gray-600">
                        Access all features and settings
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      {fullMenuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              setLocation(item.path);
                              setIsMenuOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-200 ${
                              active 
                                ? 'bg-blue-100/90 text-blue-600 scale-105 shadow-xl border border-blue-200/50' 
                                : 'bg-gray-50/80 text-gray-700 hover:bg-gray-100/90 hover:scale-105 shadow-lg'
                            }`}
                          >
                            <div className="relative">
                              <Icon className="h-8 w-8 mb-3" />
                              {item.badge && (
                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                  {item.badge}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-center">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}