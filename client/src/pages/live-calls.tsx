import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  Users, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Activity,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  Square
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import AppStoreLayout from "@/components/AppStoreLayout";

interface LiveCall {
  id: string;
  callerNumber: string;
  callerName?: string;
  callerLocation?: string;
  status: 'ringing' | 'active' | 'on_hold' | 'transferred' | 'ended';
  startTime: Date;
  duration: number;
  agent: 'ai' | 'human' | 'transfer_pending';
  agentName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  conversation: Array<{
    speaker: 'caller' | 'agent';
    message: string;
    timestamp: Date;
  }>;
  audioEnabled: boolean;
  recordingEnabled: boolean;
  transferRequested: boolean;
}

export default function LiveCallsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);

  // WebSocket connection for real-time call updates
  useWebSocket("/ws/live-calls", {
    onMessage: (data) => {
      if (data.type === 'call_update') {
        setLiveCalls(prev => {
          const existing = prev.find(call => call.id === data.call.id);
          if (existing) {
            return prev.map(call => call.id === data.call.id ? { ...call, ...data.call } : call);
          } else {
            return [...prev, data.call];
          }
        });
      } else if (data.type === 'call_ended') {
        setLiveCalls(prev => prev.filter(call => call.id !== data.callId));
      }
    }
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockCalls: LiveCall[] = [
      {
        id: "call_001",
        callerNumber: "+1 (555) 123-4567",
        callerName: "John Smith",
        callerLocation: "Atlanta, GA",
        status: "active",
        startTime: new Date(Date.now() - 180000), // 3 minutes ago
        duration: 180,
        agent: "ai",
        priority: "normal",
        conversation: [
          { speaker: "agent", message: "Hi! I'm Maya, your AI assistant. How can I help you today?", timestamp: new Date() },
          { speaker: "caller", message: "I need help with my account balance", timestamp: new Date() }
        ],
        audioEnabled: true,
        recordingEnabled: true,
        transferRequested: false
      },
      {
        id: "call_002",
        callerNumber: "+1 (555) 987-6543",
        callerName: "Sarah Johnson",
        status: "ringing",
        startTime: new Date(),
        duration: 15,
        agent: "ai",
        priority: "high",
        conversation: [],
        audioEnabled: true,
        recordingEnabled: true,
        transferRequested: false
      }
    ];
    setLiveCalls(mockCalls);
  }, []);

  const filteredCalls = liveCalls.filter(call => {
    const matchesSearch = call.callerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         call.callerNumber.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ringing': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-green-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <PhoneCall className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Calls</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg">Monitor active calls and agent performance in real-time</p>
                </div>
              </div>
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-100 rounded-xl">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-2 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-green-700">{filteredCalls.length} active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{liveCalls.filter(c => c.status === 'active').length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Active Calls</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{liveCalls.filter(c => c.status === 'ringing').length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Incoming</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{liveCalls.filter(c => c.agent === 'ai').length}</div>
              <p className="text-xs sm:text-sm text-gray-600">AI Handled</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{liveCalls.filter(c => c.transferRequested).length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Transfers</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by caller name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ringing">Ringing</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Live Calls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCalls.length === 0 ? (
            <Card className="col-span-full border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <PhoneCall className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No active calls</h3>
                <p className="text-gray-500">All calls are currently handled or completed</p>
              </CardContent>
            </Card>
          ) : (
            filteredCalls.map((call) => (
              <Card key={call.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-all">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Call Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{call.callerName || 'Unknown Caller'}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{call.callerNumber}</p>
                          {call.callerLocation && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {call.callerLocation}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
                        <Badge className={getStatusColor(call.status)}>
                          {call.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(call.priority)} variant="outline">
                          {call.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Call Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="text-xs sm:text-sm">{formatDuration(call.duration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {call.agent === 'ai' ? (
                            <>
                              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                              <span className="text-xs sm:text-sm">AI Agent</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                              <span className="text-xs sm:text-sm">{call.agentName || 'Human Agent'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.audioEnabled ? (
                          <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                        ) : (
                          <VolumeX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                        )}
                        {call.recordingEnabled && (
                          <div className="flex items-center gap-1 text-red-500">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs">REC</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Latest Conversation */}
                    {call.conversation.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-2">Latest Exchange:</div>
                        {call.conversation.slice(-2).map((msg, idx) => (
                          <div key={idx} className="text-sm mb-1">
                            <span className={msg.speaker === 'agent' ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                              {msg.speaker === 'agent' ? 'Agent' : 'Caller'}:
                            </span>
                            <span className="ml-2">{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedCall(call)}
                        className="rounded-xl flex-1 text-xs sm:text-sm"
                      >
                        Monitor
                      </Button>
                      {call.status === 'active' && call.agent === 'ai' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-xl text-orange-600 border-orange-300 hover:bg-orange-50 text-xs sm:text-sm"
                        >
                          Transfer
                        </Button>
                      )}
                      {call.status === 'ringing' && (
                        <Button 
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                        >
                          Answer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppStoreLayout>
  );
}