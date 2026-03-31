import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Voicemail, ArrowRight, User, Clock } from "lucide-react";
import { useLocation } from "wouter";
import type { Call } from "@shared/schema";
import { formatTimeOnly, formatUtcToLocal } from "@/lib/timezone";
import { formatRelativeTime as formatTimeAgo } from "@/lib/time-utils";

export default function RecentCalls() {
  const [, navigate] = useLocation();
  const { data: calls, isLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls/recent"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const getStatusBadge = (call: Call) => {
    if (call.aiHandled) {
      return <Badge className="bg-green-100 text-green-800">AI Handled</Badge>;
    } else if (call.forwarded) {
      return <Badge className="bg-blue-100 text-blue-800">Forwarded</Badge>;
    } else if (call.recordingUrl) {
      return <Badge className="bg-orange-100 text-orange-800">Voicemail</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const formatTime = (date: Date | string) => {
    return formatUtcToLocal(date, 'time');
  };

  const getCallerIcon = (index: number) => {
    const colors = ["blue", "orange", "purple", "green"];
    const color = colors[index % colors.length];
    const colorClasses = {
      blue: "bg-blue-100 text-primary",
      orange: "bg-orange-100 text-warning", 
      purple: "bg-purple-100 text-purple-600",
      green: "bg-green-100 text-accent"
    };
    
    return colorClasses[color as keyof typeof colorClasses];
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="animate-pulse flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <i className="fas fa-phone text-4xl mb-4 opacity-50"></i>
            <p>No recent calls found</p>
            <p className="text-sm">Calls will appear here once your AI assistant starts receiving them.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 hover:text-blue-700"
          onClick={() => navigate("/call-log")}
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {calls.map((call, index) => {
          const hasVoicemail = !!call.recordingUrl;
          
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
                      <h4 className="font-semibold text-gray-900">
                        {call.callerName || 'Unknown Caller'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {call.from}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(call)}
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(call.startTime!)}
                    </span>
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      {call.aiHandled ? 'AI handled this call automatically' : 
                       call.forwarded ? `Forwarded to ${call.forwardedTo}` : 
                       hasVoicemail ? 'Caller left a voicemail message' : 
                       'Call completed successfully'}
                    </p>
                  </div>
                  
                  {call.summary && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">{call.summary}</p>
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {hasVoicemail && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 text-gray-600 hover:text-orange-600"
                        onClick={() => navigate("/voicemail")}
                      >
                        <Voicemail className="w-4 h-4" />
                        <span className="text-sm">Voicemail</span>
                      </Button>
                    )}
                    
                    <span className="text-xs text-gray-500">
                      Duration: {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                    onClick={() => navigate("/call-log")}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-sm">Details</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
