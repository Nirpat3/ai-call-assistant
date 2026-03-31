import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  PhoneOff, 
  Bot, 
  User, 
  Clock, 
  Volume2, 
  VolumeX,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface LiveCallTurn {
  speaker: "caller" | "ai" | "human";
  speakerName?: string;
  message: string;
  timestamp: string;
  confidence?: number;
  sentiment?: "positive" | "negative" | "neutral";
  isPartial?: boolean; // For real-time transcription that's still being processed
}

interface LiveCall {
  callSid: string;
  from: string;
  to: string;
  callerName?: string;
  status: "ringing" | "in-progress" | "completed" | "busy" | "failed";
  startTime: Date;
  duration: number; // in seconds
  conversationTurns: LiveCallTurn[];
  currentSpeaker?: "caller" | "ai" | "human";
  isRecording: boolean;
  sentiment: "positive" | "negative" | "neutral";
}

interface LiveCallMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export function LiveCallMonitor({ isVisible = true, onClose }: LiveCallMonitorProps) {
  const [activeCalls, setActiveCalls] = useState<LiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Connected to live call monitoring");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'call_started':
        addNewCall(data.call);
        break;
      case 'call_ended':
        removeCall(data.callSid);
        break;
      case 'transcription_update':
        updateCallTranscription(data.callSid, data.transcription);
        break;
      case 'conversation_turn':
        addConversationTurn(data.callSid, data.turn);
        break;
      case 'call_status_update':
        updateCallStatus(data.callSid, data.status);
        break;
    }
  };

  const addNewCall = (callData: any) => {
    const newCall: LiveCall = {
      callSid: callData.callSid,
      from: callData.from,
      to: callData.to,
      callerName: callData.callerName,
      status: callData.status || 'ringing',
      startTime: new Date(callData.startTime),
      duration: 0,
      conversationTurns: [],
      isRecording: true,
      sentiment: 'neutral'
    };

    setActiveCalls(prev => [...prev, newCall]);
    
    // Auto-select first call if none selected
    setSelectedCall(prev => prev || newCall.callSid);
  };

  const removeCall = (callSid: string) => {
    setActiveCalls(prev => prev.filter(call => call.callSid !== callSid));
    setSelectedCall(prev => prev === callSid ? null : prev);
  };

  const updateCallTranscription = (callSid: string, transcription: any) => {
    setActiveCalls(prev => prev.map(call => {
      if (call.callSid === callSid) {
        return {
          ...call,
          conversationTurns: [
            ...call.conversationTurns.filter(turn => !turn.isPartial),
            {
              speaker: transcription.speaker || 'caller',
              message: transcription.text,
              timestamp: new Date().toLocaleTimeString(),
              confidence: transcription.confidence,
              sentiment: transcription.sentiment,
              isPartial: transcription.isPartial || false
            }
          ]
        };
      }
      return call;
    }));
  };

  const addConversationTurn = (callSid: string, turn: LiveCallTurn) => {
    setActiveCalls(prev => prev.map(call => {
      if (call.callSid === callSid) {
        return {
          ...call,
          conversationTurns: [...call.conversationTurns, turn],
          currentSpeaker: turn.speaker,
          sentiment: turn.sentiment || call.sentiment
        };
      }
      return call;
    }));
  };

  const updateCallStatus = (callSid: string, status: string) => {
    setActiveCalls(prev => prev.map(call => {
      if (call.callSid === callSid) {
        return { ...call, status: status as LiveCall['status'] };
      }
      return call;
    }));
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case "caller":
        return <Phone className="h-4 w-4" />;
      case "ai":
        return <Bot className="h-4 w-4" />;
      case "human":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSpeakerName = (turn: LiveCallTurn, call: LiveCall) => {
    if (turn.speakerName) return turn.speakerName;
    
    switch (turn.speaker) {
      case "caller":
        return call.callerName || "Caller";
      case "ai":
        return "Maya (AI Assistant)";
      case "human":
        return "Agent";
      default:
        return "Unknown";
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case "caller":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ai":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "human":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "negative":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case "ringing":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "busy":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedCallData = activeCalls.find(call => call.callSid === selectedCall);

  // Update call durations
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCalls(prev => prev.map(call => {
        if (call.status === 'in-progress') {
          return {
            ...call,
            duration: Math.floor((Date.now() - call.startTime.getTime()) / 1000)
          };
        }
        return call;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 w-96 max-h-[80vh] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <Card className="h-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardTitle className="text-lg">Live Calls</CardTitle>
              <Badge variant="secondary">{activeCalls.length}</Badge>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeCalls.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Phone className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No active calls</p>
              <p className="text-sm">Waiting for incoming calls...</p>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Calls List */}
              <div className="w-32 border-r bg-gray-50">
                <ScrollArea className="h-64">
                  {activeCalls.map((call) => (
                    <div
                      key={call.callSid}
                      className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
                        selectedCall === call.callSid ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedCall(call.callSid)}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {call.callerName?.[0] || call.from.slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                        <Badge className={`text-xs ${getCallStatusColor(call.status)}`}>
                          {call.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium truncate">
                        {call.callerName || call.from}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDuration(call.duration)}
                      </p>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Call Details */}
              <div className="flex-1">
                {selectedCallData && (
                  <div className="h-full flex flex-col">
                    {/* Call Header */}
                    <div className="p-3 border-b bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            selectedCallData.status === 'in-progress' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <span className="font-medium">
                            {selectedCallData.callerName || selectedCallData.from}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getSentimentIcon(selectedCallData.sentiment)}
                          {selectedCallData.isRecording && (
                            <Volume2 className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatDuration(selectedCallData.duration)}</span>
                        <span>{format(selectedCallData.startTime, 'HH:mm:ss')}</span>
                      </div>
                    </div>

                    {/* Conversation */}
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {selectedCallData.conversationTurns.map((turn, index) => (
                          <div key={index} className="flex space-x-2">
                            <Avatar className={`h-6 w-6 border ${getSpeakerColor(turn.speaker)}`}>
                              <AvatarFallback className="text-xs">
                                {getSpeakerIcon(turn.speaker)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium">
                                  {getSpeakerName(turn, selectedCallData)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {turn.timestamp}
                                </span>
                                {turn.confidence && (
                                  <span className="text-xs text-gray-400">
                                    {Math.round(turn.confidence * 100)}%
                                  </span>
                                )}
                                {turn.isPartial && (
                                  <AlertCircle className="h-3 w-3 text-orange-500" />
                                )}
                              </div>
                              
                              <div className={`p-2 rounded-lg text-xs ${
                                turn.speaker === 'caller' 
                                  ? 'bg-blue-50 border-l-2 border-blue-400' 
                                  : turn.speaker === 'ai'
                                  ? 'bg-purple-50 border-l-2 border-purple-400'
                                  : 'bg-green-50 border-l-2 border-green-400'
                              } ${turn.isPartial ? 'opacity-70 italic' : ''}`}>
                                <p className="text-gray-800">
                                  {turn.message}
                                  {turn.isPartial && (
                                    <span className="ml-1 animate-pulse">|</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Current Speaker Indicator */}
                    {selectedCallData.currentSpeaker && selectedCallData.status === 'in-progress' && (
                      <div className="p-2 border-t bg-gray-50">
                        <div className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-gray-600">
                            {getSpeakerName({ speaker: selectedCallData.currentSpeaker } as LiveCallTurn, selectedCallData)} is speaking...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}