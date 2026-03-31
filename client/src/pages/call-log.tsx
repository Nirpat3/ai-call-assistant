import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Phone, Clock, User, MessageSquare, CheckCircle, UserPlus, Edit, Trash2, ExternalLink, Shield, ShieldX, AlertTriangle, UserX, Search, Grid, List, Voicemail, Volume2, FileText, Radio, Calendar, Filter, Grid3X3, Eye, ArrowRight, ChevronRight } from "lucide-react";
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

  // Find contact by phone number (this would need to be implemented on the backend to join with contactPhoneNumbers)
  const existingContact = contacts?.find(c => 
    // For now, we'll check common phone fields that might exist in the contact object
    call.from.includes(c.firstName || '') || call.from.includes(c.lastName || '')
  );

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

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200/50">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="rounded-2xl border-gray-300 hover:bg-gray-50 px-6 py-2 font-semibold"
        >
          Back to Call Log
        </Button>
      </div>
    </div>
  );
}

export default function CallLog() {
  const [location, setLocation] = useLocation();
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [routingFilter, setRoutingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Handle URL parameters for routing filter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const routingParam = urlParams.get('routing');
    if (routingParam && routingParam !== routingFilter) {
      setRoutingFilter(routingParam);
    }
  }, [location]);

  // Get routing category display info
  const getRoutingCategoryInfo = (category: string) => {
    switch (category) {
      case 'sales':
        return { name: 'Sales Department', color: 'bg-green-500', icon: MessageSquare };
      case 'support':
        return { name: 'Support Department', color: 'bg-orange-500', icon: AlertTriangle };
      case 'transferred':
        return { name: 'Transferred Calls', color: 'bg-purple-500', icon: ExternalLink };
      case 'general':
        return { name: 'General Inquiries', color: 'bg-blue-500', icon: Phone };
      case 'voicemail':
        return { name: 'Voicemail Route', color: 'bg-orange-500', icon: Voicemail };
      case 'ai':
        return { name: 'AI Handled', color: 'bg-green-500', icon: Radio };
      default:
        return null;
    }
  };
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
        // Refresh call log to show completed call
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
    // For now, this would need backend support to join with contactPhoneNumbers table
    // We'll use a simple name match as placeholder
    return contacts.find(contact => 
      call.callerName?.toLowerCase().includes(contact.firstName?.toLowerCase() || '') ||
      call.callerName?.toLowerCase().includes(contact.lastName?.toLowerCase() || '')
    );
  };

  const getContactStatus = (call: Call) => {
    const contact = getContactForCall(call);
    if (!contact) return { type: 'new', label: 'New Caller', icon: UserPlus, color: 'bg-blue-100 text-blue-800' };
    if (contact.isSpam) return { type: 'spam', label: 'Spam', icon: ShieldX, color: 'bg-red-100 text-red-800' };
    if (contact.isVip) return { type: 'vip', label: 'VIP', icon: Shield, color: 'bg-purple-100 text-purple-800' };
    return { type: 'known', label: 'Known Contact', icon: User, color: 'bg-green-100 text-green-800' };
  };

  const getCallRouting = (call: Call) => {
    // Determine routing based on call data
    if (call.status === 'transferred') {
      return { type: 'transferred', label: 'Transferred', icon: ExternalLink, color: 'bg-purple-100 text-purple-800' };
    }
    
    if (call.aiHandled) {
      return { type: 'ai', label: 'AI Handled', icon: Radio, color: 'bg-green-100 text-green-800' };
    }
    
    // Check routing based on key topics or summary
    const topics = call.keyTopics?.join(' ').toLowerCase() || '';
    const summary = call.summary?.toLowerCase() || '';
    const content = topics + ' ' + summary;
    
    if (content.includes('sales') || content.includes('purchase') || content.includes('buy') || content.includes('quote')) {
      return { type: 'sales', label: 'Sales Route', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' };
    }
    
    if (content.includes('support') || content.includes('help') || content.includes('issue') || content.includes('problem')) {
      return { type: 'support', label: 'Support Route', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' };
    }
    
    if (call.recordingUrl && !call.aiHandled) {
      return { type: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'bg-gray-100 text-gray-800' };
    }
    
    return { type: 'general', label: 'General', icon: Phone, color: 'bg-gray-100 text-gray-800' };
  };

  const flagSpamMutation = useMutation({
    mutationFn: async ({ phoneNumber, isSpam }: { phoneNumber: string, isSpam: boolean }) => {
      // For now, we'll find contact by name match since phoneNumbers table is separate
      let contact = contacts.find(c => 
        c.firstName?.toLowerCase().includes('spam') || 
        c.lastName?.toLowerCase().includes('caller')
      );
      
      if (!contact) {
        await apiRequest('/api/contacts', {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Spam',
            lastName: 'Caller',
            isSpam: true,
            notes: `Flagged as spam on ${new Date().toLocaleDateString()}`
          })
        });
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
      
      // Routing filter
      if (routingFilter !== "all") {
        const routing = getCallRouting(call);
        if (routing.type.toLowerCase() !== routingFilter.toLowerCase()) return false;
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
          case "this_week":
          case "week":
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            if (callDate < weekStart) return false;
            break;
          case "last_week":
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
            if (callDate < lastWeekStart || callDate >= lastWeekEnd) return false;
            break;
          case "this_month":
          case "month":
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            if (callDate < monthStart) return false;
            break;
          case "last_month":
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
            if (callDate < lastMonthStart || callDate >= lastMonthEnd) return false;
            break;
          case "this_quarter":
          case "quarter":
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            if (callDate < quarterStart) return false;
            break;
          case "last_quarter":
            const lastQuarterStart = Math.floor((now.getMonth() - 3) / 3) * 3;
            const lastQuarterYear = lastQuarterStart < 0 ? now.getFullYear() - 1 : now.getFullYear();
            const adjustedQuarterStart = lastQuarterStart < 0 ? 9 : lastQuarterStart;
            const lastQStart = new Date(lastQuarterYear, adjustedQuarterStart, 1);
            const lastQEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            if (callDate < lastQStart || callDate >= lastQEnd) return false;
            break;
          case "this_year":
          case "year":
            const yearStart = new Date(now.getFullYear(), 0, 1);
            if (callDate < yearStart) return false;
            break;
          case "last_year":
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear(), 0, 1);
            if (callDate < lastYearStart || callDate >= lastYearEnd) return false;
            break;
          case "last_7_days":
          case "last7days":
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (callDate < sevenDaysAgo) return false;
            break;
          case "last_30_days":
          case "last30days":
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (callDate < thirtyDaysAgo) return false;
            break;
          case "last_90_days":
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
  }, [calls, statusFilter, searchQuery, dateFilter, routingFilter, contacts]);

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
        <div className="max-w-4xl mx-auto p-6">
          <CallProfile call={selectedCall} onClose={() => setSelectedCall(null)} />
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl pb-20">
        {/* Enhanced iOS 16 Header - Responsive */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left side - Icon, Title, Count */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-3 sm:p-4 bg-blue-600 rounded-2xl sm:rounded-3xl shadow-lg flex-shrink-0">
                  <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Call Log</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">Review all call history and details</p>
                </div>
                <div className="inline-flex items-center px-3 py-2 bg-blue-100 rounded-xl flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">{filteredCalls.length} calls</span>
                </div>
              </div>
              
              {/* Right side - Action buttons */}
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <Button 
                  onClick={() => setLocation('/')}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
                >
                  Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced iOS 16 Search and Filter Controls */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
          <CardContent className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search calls by name, number, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 pr-6 py-4 rounded-2xl border-0 bg-gray-100/80 text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-all text-lg font-medium"
                />
              </div>
            </div>
            
            {/* Filter Pills - Responsive Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {/* Status Filter */}
              <div className="w-full">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full rounded-2xl border-0 bg-gray-100/80 text-gray-900 font-semibold hover:bg-gray-200/80 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-all py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div>
                      <SelectValue placeholder="All Status" />
                    </div>
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
              </div>

              {/* Date Filter */}
              <div className="w-full">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full rounded-2xl border-0 bg-gray-100/80 text-gray-900 font-semibold hover:bg-gray-200/80 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-all py-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-3 flex-shrink-0"></div>
                      <SelectValue placeholder="All Time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle - Responsive */}
              <div className="w-full sm:col-span-2 lg:col-span-1 flex justify-start lg:justify-end">
                <div className="flex bg-gray-100/80 rounded-2xl p-1 w-full sm:w-auto">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`rounded-xl px-3 sm:px-4 py-2 font-semibold transition-all flex-1 sm:flex-none ${
                      viewMode === "list" 
                        ? "bg-white text-gray-900 shadow-lg" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <List className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">List</span>
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-xl px-3 sm:px-4 py-2 font-semibold transition-all flex-1 sm:flex-none ${
                      viewMode === "grid" 
                        ? "bg-white text-gray-900 shadow-lg" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <Grid className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Grid</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Cards */}
        <div className="space-y-4">
          {filteredCalls.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No calls found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {calls.length === 0 
                    ? "No calls have been recorded yet" 
                    : "No calls match your current filters"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCalls.map((call) => {
              const contactStatus = getContactStatus(call);
              const routing = getCallRouting(call);
              const contact = getContactForCall(call);
              const StatusIcon = contactStatus.icon;
              const RoutingIcon = routing.icon;
              const hasVoicemail = isVoicemail(call);
              
              return (
                <Card
                  key={call.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-md border rounded-2xl bg-white"
                  onClick={() => setSelectedCall(call)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 rounded-2xl bg-blue-100">
                          <Phone className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {contact ? `${contact.firstName} ${contact.lastName}` : (call.callerName || 'Unknown Caller')}
                            </h4>
                            <Badge className={contactStatus.color} variant="secondary">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {contactStatus.label}
                            </Badge>
                          </div>
                          <p className="text-base text-gray-700 mb-3">
                            {call.from} • {call.startTime ? formatRelativeTime(call.startTime) : 'Unknown time'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {call.duration ? formatDuration(call.duration) : "N/A"}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {call.status?.charAt(0).toUpperCase() + call.status?.slice(1)}
                            </span>
                            {call.aiHandled && (
                              <span className="flex items-center text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                AI Handled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center space-x-3 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                          }}
                          className="flex-1 hover:bg-blue-50 hover:border-blue-300 rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        {contact && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/contact/${contact.id}`);
                            }}
                            className="text-green-600 hover:bg-green-50 hover:border-green-300 rounded-xl px-4"
                          >
                            <User className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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
      
      </div>
    </AppStoreLayout>
  );
}
