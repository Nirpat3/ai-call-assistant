import { useState } from "react";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  submenu?: { id: string; icon: string; label: string; }[];
}

export default function Sidebar({ activePage, onPageChange, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    { id: "dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { 
      id: "calls-group", 
      icon: "fas fa-phone", 
      label: "Call Operations",
      submenu: [
        { id: "call-log", icon: "fas fa-list", label: "Call Log" },
        { id: "voicemail", icon: "fas fa-voicemail", label: "Voicemail" },
      ]
    },
    { id: "knowledge-base", icon: "fas fa-brain", label: "Knowledge Management" },
    { id: "contacts", icon: "fas fa-address-book", label: "Contact Operations" },
    { 
      id: "analytics-group", 
      icon: "fas fa-chart-bar", 
      label: "Analytics",
      submenu: [
        { id: "analytics-calls", icon: "fas fa-chart-line", label: "Call Analytics" },
        { id: "analytics-ai", icon: "fas fa-robot", label: "AI Performance" },
      ]
    },
    { 
      id: "setup-management", 
      icon: "fas fa-cogs", 
      label: "Setup & Management",
      submenu: [
        { id: "onboarding", icon: "fas fa-play-circle", label: "Setup Wizard" },
        { id: "call-forwarding-setup", icon: "fas fa-phone-forwarded", label: "Call Forwarding" },
        { id: "ai-assistant-config", icon: "fas fa-robot", label: "AI Assistant Config" },
      ]
    },
    { 
      id: "settings", 
      icon: "fas fa-cog", 
      label: "Settings",
      submenu: [
        { id: "call-settings", icon: "fas fa-phone-alt", label: "Call Settings" },
        { id: "ai-config", icon: "fas fa-robot", label: "AI Configuration" },
        { id: "integrations", icon: "fas fa-plug", label: "Integrations" },
        { id: "system-settings", icon: "fas fa-sliders-h", label: "System Settings" },
      ]
    },
    { id: "testing", icon: "fas fa-flask", label: "Testing Center" },
    { id: "support-automation", icon: "fas fa-cogs", label: "Support Automation" },
    { id: "support", icon: "fas fa-life-ring", label: "Support" },
  ];

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleItemClick = (itemId: string, hasSubmenu = false) => {
    if (hasSubmenu) {
      toggleSubmenu(itemId);
    } else {
      // Handle navigation based on item ID
      let route = "/";
      switch (itemId) {
        case "dashboard":
          route = "/";
          break;

        case "call-log":
          route = "/call-log";
          break;
        case "voicemail":
          route = "/voicemail";
          break;
        case "knowledge-base":
          route = "/knowledge-base";
          break;
        case "contacts":
          route = "/contacts";
          break;
        case "analytics-calls":
          route = "/analytics/calls";
          break;
        case "analytics-ai":
          route = "/analytics/ai";
          break;
        case "onboarding":
          route = "/onboarding";
          break;
        case "call-forwarding-setup":
          route = "/call-forwarding-setup";
          break;
        case "ai-assistant-config":
          route = "/ai-assistant-config";
          break;
        case "call-settings":
          route = "/settings/call-settings";
          break;
        case "ai-config":
          route = "/settings/ai-config";
          break;
        case "integrations":
          route = "/settings/integrations";
          break;
        case "system-settings":
          route = "/settings/system";
          break;
        case "testing":
          route = "/testing";
          break;
        case "support-automation":
          route = "/support-automation";
          break;
        case "support":
          route = "/support";
          break;
      }
      window.location.href = route;
      if (onMobileClose) {
        onMobileClose();
      }
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        sidebar-container left-0 z-50 lg:z-auto
        w-64 bg-surface shadow-lg border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isMobileOpen ? 'translate-x-0 inset-y-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">CallBot AI</h1>
            <p className="text-sm text-gray-500">Assistant Dashboard</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => handleItemClick(item.id, !!item.submenu)}
              className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                activePage === item.id || (item.submenu && item.submenu.some(sub => sub.id === activePage))
                  ? "text-primary bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center">
                <i className={`${item.icon} mr-3 ${
                  activePage === item.id || (item.submenu && item.submenu.some(sub => sub.id === activePage))
                    ? "text-primary" 
                    : "text-gray-400"
                }`}></i>
                {item.label}
              </div>
              {item.submenu && (
                <i className={`fas fa-chevron-${expandedMenus.includes(item.id) ? 'down' : 'right'} text-xs text-gray-400`}></i>
              )}
            </button>
            
            {/* Submenu */}
            {item.submenu && expandedMenus.includes(item.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => handleItemClick(subItem.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activePage === subItem.id
                        ? "text-primary bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <i className={`${subItem.icon} mr-3 text-xs ${
                      activePage === subItem.id ? "text-primary" : "text-gray-400"
                    }`}></i>
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
            <p className="text-xs text-gray-500 truncate">john@company.com</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
