import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Phone, Clock, User, MessageSquare, CheckCircle, UserPlus, Edit, Trash2, ExternalLink, Shield, ShieldX, AlertTriangle, UserX, Search, Grid, List, Voicemail, Volume2, FileText, Radio, Calendar, Filter, Grid3X3, Eye } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertContactSchema, type Call, type Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, formatTimeOnly, formatRelativeTime, getDisplayTimezone, formatUtcToLocal, utcToLocal } from "@/lib/timezone";
import AppStoreLayout from "@/components/AppStoreLayout";
import { ConversationChat } from "@/components/ui/conversation-chat";
import { LiveCallMonitor } from "@/components/live-call-monitor";
import { useWebSocket } from "@/hooks/useWebSocket";
import { FloatingCallMonitor } from "@/components/FloatingCallMonitor";
import { z } from "zod";

const contactFormSchema = insertContactSchema.extend({
  notes: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required")
});

interface CallProfileProps {
  call: Call;
  onClose: () => void;
}

function CallProfile({ call, onClose }: CallProfileProps) {
  const { data: contacts } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });
  const [showAddContact, setShowAddContact] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const existingContact = contacts?.find(c => c.phoneNumbers?.includes(call.from));

  const addContactForm = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: call.callerName?.split(' ')[0] || '',
      lastName: call.callerName?.split(' ').slice(1).join(' ') || '',
      phoneNumber: call.from,
      email: '',
      company: '',
      position: '',
      notes: `Added from call on ${new Date(call.startTime || new Date()).toLocaleDateString()}`,
      isVip: false,
      tags: []
    }
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contactFormSchema>) => {
      const contactData = {
        ...data,
        phoneNumbers: [data.phoneNumber],
        phoneNumber: undefined
      };
      return await apiRequest("/api/contacts", { method: "POST", body: JSON.stringify(contactData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowAddContact(false);
      toast({
        title: "Contact Added",
        description: "Contact has been successfully added to your contact list."
      });
    }
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Not available";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVoicemail = (call: Call) => {
    return call.recordingUrl && (call.status === 'completed' || call.summary?.toLowerCase().includes('voicemail'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'no-answer': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{call.callerName || 'Unknown Caller'}</h2>
            <p className="text-gray-600">{call.from}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className={getStatusColor(call.status)}>{call.status}</Badge>
          <p className="text-sm text-gray-500 mt-1">
            {call.startTime ? formatUtcToLocal(call.startTime, 'medium') : 'Unknown time'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatDuration(call.duration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Handled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {call.aiHandled ? 'Yes' : 'No'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              Forwarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {call.forwarded ? call.forwardedTo || 'Yes' : 'No'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Conversation Display */}
      {(call.conversationBreakdown || call.transcription || call.recordingUrl) && (
        <ConversationChat
          callId={call.id}
          conversationBreakdown={call.conversationBreakdown || []}
          transcription={call.transcription || undefined}
          sentiment={call.sentiment || undefined}
          keyTopics={call.keyTopics || []}
          actionItems={call.actionItems || []}
          summary={call.summary || undefined}
          recordingUrl={call.recordingUrl || undefined}
          duration={call.duration || undefined}
          callDate={call.startTime ? new Date(call.startTime) : undefined}
          callerName={call.callerName || undefined}
          isExpanded={true}
        />
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default function CallLog() {
  const [, setLocation] = useLocation();
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [liveCalls, setLiveCalls] = useState<any[]>([]);
  const [showLiveCallPopup, setShowLiveCallPopup] = useState(false);
  const [selectedLiveCall, setSelectedLiveCall] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for live call monitoring
  useWebSocket({
    onMessage: (msg) => {
      const data = msg.data;
      if (msg.type === "call_new") {
        setLiveCalls(prev => [...prev, data?.call]);
      } else if (msg.type === "call_ended") {
        setLiveCalls(prev => prev.filter(call => call.callSid !== data?.callSid));
        queryClient.invalidateQueries({ queryKey: ["/api/calls/recent"] });
      } else if (msg.type === "conversation_update" && selectedLiveCall?.callSid === data?.callSid) {
        setSelectedLiveCall((prev: any) => prev ? {
          ...prev,
          conversationTurns: [...(prev.conversationTurns || []), data?.turn]
        } : null);
      }
    }
  });

  const { data: calls = [], isLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls/recent"],
    refetchInterval: 30000
  });



  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"]
  });

  const getContactForCall = (call: Call) => {
    return contacts.find(contact => 
      contact.phoneNumbers?.includes(call.from)
    );
  };

  const getContactStatus = (call: Call) => {
    const contact = getContactForCall(call);
    if (!contact) return { type: 'new', label: 'New Caller', icon: UserPlus, color: 'bg-blue-100 text-blue-800' };
    if (contact.isSpam) return { type: 'spam', label: 'Spam', icon: ShieldX, color: 'bg-red-100 text-red-800' };
    if (contact.isVip) return { type: 'vip', label: 'VIP', icon: Shield, color: 'bg-purple-100 text-purple-800' };
    return { type: 'known', label: 'Known Contact', icon: User, color: 'bg-green-100 text-green-800' };
  };

  const flagSpamMutation = useMutation({
    mutationFn: async ({ phoneNumber, isSpam }: { phoneNumber: string, isSpam: boolean }) => {
      let contact = contacts.find(c => c.phoneNumbers?.includes(phoneNumber));
      
      if (!contact) {
        await apiRequest('/api/contacts', { method: 'POST', body: JSON.stringify({ firstName: 'Spam', lastName: 'Caller', phoneNumbers: [phoneNumber], isSpam: true, notes: `Flagged as spam on ${new Date().toLocaleDateString()}` }) });
      } else {
        await apiRequest(`/api/contacts/${contact.id}`, { method: 'PATCH', body: JSON.stringify({ isSpam }) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contact Updated",
        description: "Spam status has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update spam status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const transcribeVoicemailMutation = useMutation({
    mutationFn: async (callId: number) => {
      return await apiRequest(`/api/calls/${callId}/transcribe`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls/recent"] });
      toast({
        title: "Transcription Complete",
        description: "Voicemail has been converted to text successfully."
      });
    },
    onError: () => {
      toast({
        title: "Transcription Failed",
        description: "Unable to convert voicemail to text. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Enhanced filtering with search and date range
  const filteredCalls = useMemo(() => {
    if (!calls || calls.length === 0) return [];
    
    const filtered = calls.filter(call => {
      // Status filter
      if (statusFilter !== "all" && call.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesPhone = call.from?.toLowerCase().includes(query) || 
                           call.to?.toLowerCase().includes(query);
        const matchesName = call.callerName?.toLowerCase().includes(query);
        const contact = getContactForCall(call);
        const matchesContact = contact?.firstName?.toLowerCase().includes(query) ||
                              contact?.lastName?.toLowerCase().includes(query) ||
                              contact?.displayName?.toLowerCase().includes(query);
        
        if (!matchesPhone && !matchesName && !matchesContact) return false;
      }
      
      // Date filter
      if (dateFilter !== "all" && call.startTime) {
        const callDate = new Date(call.startTime);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case "today":
            if (callDate.toDateString() !== today.toDateString()) return false;
            break;
          case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (callDate.toDateString() !== yesterday.toDateString()) return false;
            break;
          case "week":
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            if (callDate < weekStart) return false;
            break;
          case "month":
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            if (callDate < monthStart) return false;
            break;
          case "quarter":
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            if (callDate < quarterStart) return false;
            break;
          case "year":
            const yearStart = new Date(now.getFullYear(), 0, 1);
            if (callDate < yearStart) return false;
            break;
          case "last7days":
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (callDate < sevenDaysAgo) return false;
            break;
          case "last30days":
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (callDate < thirtyDaysAgo) return false;
            break;
          case "last90days":
            const ninetyDaysAgo = new Date(today);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            if (callDate < ninetyDaysAgo) return false;
            break;
        }
      }
      
      return true;
    });
    

    return filtered;
  }, [calls, statusFilter, searchQuery, dateFilter, contacts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'no-answer': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Not available";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVoicemail = (call: Call) => {
    return call.recordingUrl && (call.status === 'completed' || call.summary?.toLowerCase().includes('voicemail'));
  };

  if (isLoading) {
    return (
      <AppStoreLayout title="Calls" subtitle="Loading call history...">
        <div className="p-6 space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  if (selectedCall) {
    return (
      <AppStoreLayout title="Call Details" subtitle="View call conversation and details">
        <div className="p-6">
          <CallProfile call={selectedCall} onClose={() => setSelectedCall(null)} />
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout title="Calls" subtitle="Call History & Management">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Search and Filter Controls */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search calls by name, number, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredCalls.length} of {calls.length} calls
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
          
          {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setDateFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Log</h1>
          <p className="text-gray-600">Review all call history and details</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Live Call Indicator */}
          {liveCalls.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="relative"
                onClick={() => {
                  setSelectedLiveCall(liveCalls[0]);
                  setShowLiveCallPopup(true);
                }}
              >
                <div className="relative">
                  <MessageSquare className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1">
                    <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                  </div>
                </div>
                <span className="ml-2">Live Call ({liveCalls.length})</span>
              </Button>
            </div>
          )}
          
          {/* Test Live Call Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const testCall = {
                callSid: 'test_' + Date.now(),
                callerNumber: '+1234567890',
                callerName: 'Test Caller',
                currentAgent: 'Maya (AI Receptionist)',
                duration: 45,
                conversationTurns: [
                  {
                    speaker: 'caller',
                    content: 'Hello, I need help with my account.',
                    timestamp: new Date()
                  },
                  {
                    speaker: 'assistant',
                    content: 'Hello! I\'d be happy to help you with your account. Can you please provide me with your account number or the phone number associated with your account?',
                    timestamp: new Date(Date.now() + 2000)
                  }
                ]
              };
              setLiveCalls([testCall]);
              setSelectedLiveCall(testCall);
              setShowLiveCallPopup(true);
            }}
          >
            Test Live Call
          </Button>
          
          <Button onClick={() => setLocation('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Recent Calls Quick Access */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Calls</span>
            <Badge variant="secondary">{calls.slice(0, 5).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calls.slice(0, 5).map((call) => {
              const contact = getContactForCall(call);
              const hasVoicemail = isVoicemail(call);
              const contactStatus = getContactStatus(call);
              const StatusIcon = contactStatus.icon;

              return (
                <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCall(call)}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full relative">
                      <Phone className="h-4 w-4 text-blue-600" />
                      {hasVoicemail && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                          <Voicemail className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm">
                          {contact ? `${contact.firstName} ${contact.lastName}` : (call.callerName || 'Unknown Caller')}
                        </p>
                        <Badge className={contactStatus.color} variant="secondary">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {contactStatus.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{call.from}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {call.startTime ? formatUtcToLocal(call.startTime, 'medium') : 'Unknown time'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {call.duration ? formatDuration(call.duration) : "N/A"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search calls by phone number, name, company, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none border-l"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* All Calls Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">All Calls</h2>
          <p className="text-sm text-gray-600">Complete call history with filters and search</p>
        </div>
        <Badge variant="outline">{filteredCalls.length} calls</Badge>
      </div>

      {/* Social Media Style Call Feed */}
      <div className="max-w-2xl mx-auto space-y-6">
        {filteredCalls.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
              <p className="text-gray-500">
                {calls.length === 0 
                  ? "No calls have been recorded yet" 
                  : "No calls match your current filters"
                }
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search terms or filters
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCalls.map((call) => {
            const contactStatus = getContactStatus(call);
            const contact = getContactForCall(call);
            const StatusIcon = contactStatus.icon;
            const hasVoicemail = isVoicemail(call);
            
            return (
              <Card key={call.id} className="overflow-hidden bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                        <Phone className="w-5 h-5 text-blue-600" />
                        {hasVoicemail && (
                          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                            <Voicemail className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {contact ? `${contact.firstName} ${contact.lastName}` : (call.callerName || 'Unknown Caller')}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {call.from}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={contactStatus.color} variant="secondary">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {contactStatus.label}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {call.startTime ? formatUtcToLocal(call.startTime, 'time') : 'Unknown time'}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 text-center">
                        {call.aiHandled ? 'AI handled this call' : 
                         call.forwarded ? `Forwarded to ${call.forwardedTo}` : 
                         hasVoicemail ? 'Caller left a voicemail' : 
                         'Call completed'}
                      </p>
                    </div>

                    {/* Call Info */}
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center justify-between">
                        <span>Duration:</span>
                        <span>{call.duration ? formatDuration(call.duration) : "Not available"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Date:</span>
                        <span>{call.startTime ? formatUtcToLocal(call.startTime, 'date') : 'Unknown date'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge className={getStatusColor(call.status)} variant="outline">
                          {call.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      {hasVoicemail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center space-x-2 text-gray-600 hover:text-orange-600"
                          onClick={() => {
                            // Navigate to voicemail page with this call's voicemail
                            setLocation('/voicemail');
                          }}
                        >
                          <Voicemail className="w-4 h-4" />
                          <span className="text-sm">Voicemail</span>
                        </Button>
                      )}
                      
                      {!call.transcription && hasVoicemail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600"
                          onClick={async (e) => {
                            e.stopPropagation();
                            transcribeVoicemailMutation.mutate(call.id);
                          }}
                          disabled={transcribeVoicemailMutation.isPending}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">Transcribe</span>
                        </Button>
                      )}
                      
                      {contactStatus.type === 'new' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center space-x-2 text-gray-600 hover:text-red-600"
                          onClick={async (e) => {
                            e.stopPropagation();
                            flagSpamMutation.mutate({ phoneNumber: call.from, isSpam: true });
                          }}
                          disabled={flagSpamMutation.isPending}
                        >
                          <ShieldX className="w-4 h-4" />
                          <span className="text-sm">Block</span>
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                      onClick={() => setSelectedCall(call)}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Details</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Live Call Monitor Dialog */}
      {showLiveCallPopup && selectedLiveCall && (
        <Dialog open={showLiveCallPopup} onOpenChange={setShowLiveCallPopup}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Live Call - {selectedLiveCall.callerName || selectedLiveCall.callerNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Call In Progress</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700">
                      {Math.floor(selectedLiveCall.duration / 60)}:{(selectedLiveCall.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-green-700">
                  Agent: {selectedLiveCall.currentAgent}
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h3 className="font-medium">Conversation</h3>
                <div className="space-y-3">
                  {selectedLiveCall.conversationTurns && selectedLiveCall.conversationTurns.length > 0 ? (
                    selectedLiveCall.conversationTurns.map((turn: any, index: number) => (
                      <div
                        key={index}
                        className={`flex ${turn.speaker === 'caller' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs p-3 rounded-lg ${
                            turn.speaker === 'caller'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          <div className="text-xs opacity-75 mb-1">
                            {turn.speaker === 'caller' ? 'Caller' : 'Maya'}
                          </div>
                          <p className="text-sm">{turn.content}</p>
                          <div className="text-xs opacity-75 mt-1">
                            {new Date(turn.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Waiting for conversation to begin...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <FloatingCallMonitor 
        liveCalls={[]} 
        onCallSelect={(call: any) => setSelectedCall(call)} 
      />
      </div>
    </AppStoreLayout>
  );
}
