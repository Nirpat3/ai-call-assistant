import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { 
  Phone, 
  Voicemail, 
  Settings, 
  Activity, 
  Clock, 
  Users,
  TrendingUp,
  MessageSquare,
  Calendar,
  PlayCircle,
  Download,
  Archive,
  BarChart3,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { id: 'setup', label: 'Setup', icon: Settings },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export default function PersonalAssistantApp() {
  const [activeTab, setActiveTab] = useState('calls');
  const [, setLocation] = useLocation();

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: calls = [] } = useQuery({
    queryKey: ["/api/calls"],
  });

  const { data: voicemails = [] } = useQuery({
    queryKey: ["/api/voicemails"],
  });

  const renderCallsTab = () => (
    <div className="space-y-4">
      {/* iPhone-style header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Recent</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-500 hover:bg-blue-50">
          Edit
        </Button>
      </div>

      {/* iPhone-style call list */}
      <div className="bg-white rounded-xl overflow-hidden">
        {!Array.isArray(calls) || calls.length === 0 ? (
          <div className="text-center py-16">
            <Phone className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No Recent Calls</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {calls.map((call: any, index: number) => (
              <div key={call.id || index} className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Call direction icon */}
                    <div className="w-5 h-5 flex items-center justify-center">
                      {call.direction === 'outbound' ? (
                        <div className="w-4 h-4 text-blue-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5H9z"/>
                          </svg>
                        </div>
                      ) : call.status === 'missed' ? (
                        <div className="w-4 h-4 text-red-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 7L12 14.59 6.41 9H11V7H3v8h2v-4.59l7 7 9-9z"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 text-green-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.2c.27-.27.35-.67.24-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM5.03 5h1.5c.07.88.22 1.75.46 2.59L5.79 8.8c-.41-1.21-.67-2.48-.76-3.8zM19 18.97c-1.32-.09-2.59-.35-3.8-.75l1.2-1.2c.85.24 1.72.39 2.6.45v1.5z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {call.callerNumber || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 ml-2 flex-shrink-0">
                          {call.createdAt ? new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm text-gray-500">
                          {call.direction === 'outbound' ? 'Outgoing' : 
                           call.status === 'missed' ? 'Missed' : 'Incoming'}
                        </p>
                        {call.duration && call.duration > 0 && (
                          <p className="text-sm text-gray-500">
                            {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Info button */}
                  <Button variant="ghost" size="sm" className="ml-2 p-1 h-8 w-8">
                    <div className="w-4 h-4 text-blue-500">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                    </div>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderVoicemailTab = () => (
    <div className="space-y-4">
      {/* iPhone-style voicemail header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Voicemail</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-500 hover:bg-blue-50">
          Edit
        </Button>
      </div>

      {/* iPhone-style voicemail list */}
      <div className="bg-white rounded-xl overflow-hidden">
        {!Array.isArray(voicemails) || voicemails.length === 0 ? (
          <div className="text-center py-16">
            <Voicemail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No Voicemails</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {voicemails.map((vm: any, index: number) => (
              <div key={vm.id || index} className="px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Voicemail status indicator */}
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {vm.callerNumber || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500 ml-2 flex-shrink-0">
                        {vm.createdAt ? new Date(vm.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">
                        {vm.createdAt ? new Date(vm.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </p>
                      {vm.duration && (
                        <p className="text-sm text-gray-500">
                          {Math.floor(vm.duration / 60)}:{(vm.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                    </div>

                    {/* Transcription */}
                    {vm.transcription && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          "{vm.transcription}"
                        </p>
                      </div>
                    )}

                    {/* Playback controls */}
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="ghost" className="p-2 h-8 w-8">
                        <div className="w-4 h-4 text-blue-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </Button>
                      
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '0%'}}></div>
                      </div>
                      
                      <Button size="sm" variant="ghost" className="p-2 h-8 w-8">
                        <div className="w-4 h-4 text-gray-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Call back and info buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="p-2 h-8 w-8">
                      <div className="w-4 h-4 text-blue-500">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                        </svg>
                      </div>
                    </Button>
                    
                    <Button size="sm" variant="ghost" className="p-2 h-8 w-8">
                      <div className="w-4 h-4 text-blue-500">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSetupTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Assistant Configuration
            </CardTitle>
            <CardDescription>Customize your AI assistant behavior and responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Voice Recognition</p>
                  <p className="text-sm text-gray-600">AI voice processing enabled</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Call Routing</p>
                  <p className="text-sm text-gray-600">Department routing & phone tree</p>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">Configure</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Smart Routing</p>
                  <p className="text-sm text-gray-600">Intelligent call distribution</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={() => setLocation('/ai-assistant-config')}
            >
              Configure AI Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone System Setup
            </CardTitle>
            <CardDescription>Configure your phone numbers and routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium">Primary Number</p>
                <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setLocation('/call-settings')}
              >
                Configure Call Routing
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setLocation('/call-forwarding-setup')}
              >
                Call Forwarding Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>AI assistant performance and call statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dashboardStats?.callsToday || 0}</div>
                  <div className="text-sm text-blue-800">Calls Handled</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{dashboardStats?.automationRate || 0}%</div>
                  <div className="text-sm text-green-800">Automation Rate</div>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Analysis
            </CardTitle>
            <CardDescription>AI conversation insights and sentiment analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 border rounded-lg">
                <p className="font-medium">Average Sentiment</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">75% Positive</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                Conversation Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <AppLayout 
      appName="Personal Assistant" 
      appIcon={Phone}
      appColor="bg-blue-500"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="p-6 space-y-6">

        {/* Tab Content */}
        <div className="mt-8 bg-white rounded-lg border shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'calls' && 'Call Management'}
              {activeTab === 'voicemail' && 'Voicemail Center'}
              {activeTab === 'setup' && 'AI Assistant Setup'}
              {activeTab === 'analytics' && 'Performance Analytics'}
            </h2>
            <p className="text-sm text-gray-600">
              {activeTab === 'calls' && 'Manage incoming and outgoing calls'}
              {activeTab === 'voicemail' && 'Review and manage voicemail messages'}
              {activeTab === 'setup' && 'Configure your AI assistant settings'}
              {activeTab === 'analytics' && 'View performance metrics and insights'}
            </p>
          </div>
          
          {activeTab === 'calls' && renderCallsTab()}
          {activeTab === 'voicemail' && renderVoicemailTab()}
          {activeTab === 'setup' && renderSetupTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      </div>
    </AppLayout>
  );
}