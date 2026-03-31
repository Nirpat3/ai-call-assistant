import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import ContactsPage from "@/pages/contacts";
import ContactDuplicates from "@/pages/contact-duplicates";
import MobileSync from "@/pages/mobile-sync";
import { 
  Users, 
  UserPlus, 
  Search, 
  MessageSquare, 
  UserCheck, 
  Phone,
  Settings,
  Smartphone,
  Download
} from "lucide-react";

export default function ContactsApp() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.split('/').pop();
    switch (path) {
      case 'contacts':
        return 'contacts';
      case 'duplicate-detection':
        return 'duplicates';
      case 'mobile-sync':
        return 'sync';
      case 'contact-settings':
        return 'settings';
      default:
        return 'contacts';
    }
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'contacts':
        setLocation('/contacts');
        break;
      case 'duplicates':
        setLocation('/duplicate-detection');
        break;
      case 'sync':
        setLocation('/mobile-sync');
        break;
      case 'settings':
        setLocation('/contact-settings');
        break;
    }
  };

  const tabs = [
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: Users
    },
    { 
      id: 'duplicates', 
      label: 'Duplicates', 
      icon: UserCheck
    },
    { 
      id: 'sync', 
      label: 'Mobile Sync', 
      icon: Smartphone
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings
    }
  ];

  return (
    <AppLayout
      appName="Contacts"
      appIcon={Users}
      appColor="bg-teal-500"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {/* Render appropriate contact component based on active tab */}
      {activeTab === 'contacts' && <ContactsPage />}
      {activeTab === 'duplicates' && <ContactDuplicates />}
      {activeTab === 'sync' && <MobileSync />}
      {activeTab === 'settings' && (
        <div className="p-6">
          <div className="text-center py-8">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Contact Settings</h3>
            <p className="text-gray-600">
              Configure contact preferences and routing rules.
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}