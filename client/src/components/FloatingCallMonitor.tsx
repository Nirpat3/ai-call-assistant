import { useState } from "react";
import { Phone, PhoneCall, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface LiveCall {
  callSid: string;
  from: string;
  to: string;
  status: string;
  startTime: Date;
  callerName?: string;
  conversationTurns?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

interface FloatingCallMonitorProps {
  liveCalls: LiveCall[];
  onCallSelect: (call: LiveCall) => void;
}

export function FloatingCallMonitor({ liveCalls, onCallSelect }: FloatingCallMonitorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (liveCalls.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Phone Icon */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="fixed bottom-20 right-4 z-40">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 animate-pulse"
            >
              <div className="relative">
                <Phone className="h-6 w-6 text-white" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {liveCalls.length}
                </Badge>
              </div>
            </Button>
          </div>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PhoneCall className="h-5 w-5" />
              <span>Active Calls ({liveCalls.length})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {liveCalls.map((call) => (
              <Card key={call.callSid} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {call.callerName || call.from}
                        </h3>
                        <p className="text-sm text-gray-600">{call.from}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {call.status}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(call.startTime, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {call.conversationTurns && call.conversationTurns.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recent conversation:</p>
                      {call.conversationTurns.slice(-3).map((turn, index) => (
                        <div 
                          key={index}
                          className={`text-sm p-2 rounded ${
                            turn.role === 'user' 
                              ? 'bg-gray-100 text-gray-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <span className="font-medium">
                            {turn.role === 'user' ? 'Caller' : 'AI Assistant'}:
                          </span>{' '}
                          {turn.content}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onCallSelect(call);
                        setIsOpen(false);
                      }}
                    >
                      Monitor Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}