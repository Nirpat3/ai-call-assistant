import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import LiveCallModal from "./LiveCallModal";
import type { Call } from "@shared/schema";

export default function LiveCallMonitor() {
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const { data: recentCalls } = useQuery<Call[]>({
    queryKey: ["/api/calls/recent"],
    refetchInterval: 5000, // Fallback polling
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (msg) => {
      const data = msg.data;
      if (msg.type === "call_update" && data?.call) {
        setActiveCalls(prev => {
          const existing = prev.find(call => call.id === data.call.id);
          if (existing) {
            return prev.map(call => 
              call.id === data.call.id ? { ...call, ...data.call } : call
            );
          } else if (data.call.status === "in-progress" || data.call.status === "ringing") {
            return [...prev, data.call];
          }
          return prev;
        });
      }
      
      if (msg.type === "call_ended" && data?.callId) {
        setActiveCalls(prev => prev.filter(call => call.id !== data.callId));
      }
    },
    onConnect: () => {
      console.log("Connected to live call monitoring");
    }
  });

  // Initialize active calls from recent calls
  useEffect(() => {
    if (recentCalls) {
      const active = recentCalls.filter(call => 
        call.status === "in-progress" || call.status === "ringing"
      );
      setActiveCalls(active);
    }
  }, [recentCalls]);

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case "ringing":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "Unknown";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Live Call Monitor
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeCalls.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="fas fa-phone text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Calls</h3>
              <p className="text-gray-600">All calls are currently handled or completed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">
                          {call.callerName || formatPhoneNumber(call.from)}
                        </p>
                        <Badge className={getCallStatusColor(call.status)}>
                          {call.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        From: {formatPhoneNumber(call.from)}
                      </p>
                      {call.status === "in-progress" && call.startTime && (
                        <p className="text-sm text-gray-600">
                          Duration: {formatDuration(call.startTime)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {call.aiHandled && (
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        AI Handled
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCall(call)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCall && (
        <LiveCallModal
          callData={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
}