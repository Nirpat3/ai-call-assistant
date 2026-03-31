import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
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
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { id: 'setup', label: 'Setup', icon: Settings },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export default function PersonalAssistantDashboard() {
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

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.callsToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{dashboardStats?.callsThisWeek || 0} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Handled</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.aiHandled || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats?.automationRate || 0}% automation rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voicemails</CardTitle>
              <Voicemail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{voicemails.length}</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.avgResponseTime || 0}s</div>
              <p className="text-xs text-muted-foreground">
                AI response time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === 'calls' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Call Monitoring
                  </CardTitle>
                  <CardDescription>Real-time call activity and AI performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium">AI System Active</p>
                          <p className="text-sm text-gray-600">Ready to handle incoming calls</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Online</Badge>
                    </div>
                    <Button className="w-full" variant="outline">
                      <Phone className="w-4 h-4 mr-2" />
                      View Live Calls
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Call Activity
                  </CardTitle>
                  <CardDescription>Latest call interactions and outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(calls) && calls.slice(0, 3).map((call: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="font-medium">{call.callerNumber || 'Unknown'}</p>
                            <p className="text-sm text-gray-600">{call.duration || '0'}s • {call.outcome || 'AI Handled'}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{call.status || 'Completed'}</Badge>
                      </div>
                    ))}
                    <Button className="w-full" variant="outline" size="sm">
                      View All Calls
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'voicemail' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Voicemail className="h-5 w-5" />
                    Voicemail Management
                  </CardTitle>
                  <CardDescription>AI-transcribed voicemails with smart categorization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!Array.isArray(voicemails) || voicemails.length === 0 ? (
                      <div className="text-center py-8">
                        <Voicemail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">No voicemails to review</p>
                      </div>
                    ) : (
                      voicemails.slice(0, 5).map((vm: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{vm.callerNumber || 'Unknown'}</p>
                              <p className="text-sm text-gray-600">{vm.timestamp}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <PlayCircle className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm">{vm.transcription || 'Transcription pending...'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{vm.category || 'General'}</Badge>
                            <Badge variant="outline">{vm.urgency || 'Normal'}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive All Reviewed
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Transcriptions
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Voicemail Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'setup' && (
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
                        <p className="font-medium">Smart Routing</p>
                        <p className="text-sm text-gray-600">Intelligent call distribution</p>
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
                        <p className="font-medium">Voicemail Transcription</p>
                        <p className="text-sm text-gray-600">Auto-transcribe messages</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                  <Button className="w-full">
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
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Call Forwarding</p>
                      <p className="text-sm text-gray-600">Forward to: +1 (555) 987-6543</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setLocation('/settings/call-settings')}
                    >
                      Configure Call Routing
                    </Button>
                    <Button className="w-full" variant="outline">
                      Call Forwarding Setup
                    </Button>
                    <Button className="w-full" variant="outline">
                      Number Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
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
        )}
      </div>
    </AppLayout>
  );
}