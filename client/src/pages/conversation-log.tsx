import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, Clock, Phone, User, Bot, Download, Share, Copy, PlayCircle, Volume2, VolumeX, Star, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import AppStoreLayout from "@/components/AppStoreLayout";

interface ConversationTurn {
  speaker: "caller" | "ai" | "human";
  speakerName?: string;
  message: string;
  timestamp: string;
  confidence?: number;
  sentiment?: "positive" | "negative" | "neutral";
}

interface Call {
  id: number;
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration: number;
  startTime: Date;
  endTime: Date | null;
  recordingUrl: string | null;
  transcription: string | null;
  conversationBreakdown: ConversationTurn[] | null;
  sentiment: string | null;
  keyTopics: string[] | null;
  actionItems: string[] | null;
  summary: string | null;
  aiHandled: boolean;
  forwarded: boolean;
  forwardedTo: string | null;
  callerName: string | null;
}

export default function ConversationLog() {
  const [, params] = useRoute("/conversation/:callId");
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  
  const callId = params?.callId ? parseInt(params.callId) : null;

  const { data: call, isLoading } = useQuery<Call>({
    queryKey: [`/api/calls/${callId}`],
    enabled: !!callId,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'caller':
        return <User className="w-5 h-5" />;
      case 'ai':
        return <Bot className="w-5 h-5" />;
      case 'human':
        return <Phone className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getSpeakerName = (speaker: string, speakerName?: string) => {
    if (speakerName) return speakerName;
    switch (speaker) {
      case 'caller':
        return call?.callerName || 'Caller';
      case 'ai':
        return 'AI Assistant';
      case 'human':
        return 'Human Agent';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <AppStoreLayout title="Conversation Log" subtitle="Loading conversation details...">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  if (!call) {
    return (
      <AppStoreLayout title="Conversation Not Found" subtitle="The requested conversation could not be found">
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="text-center p-8 rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
            <CardContent>
              <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Conversation Not Found</h3>
              <p className="text-gray-600 mb-6">The conversation you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => setLocation('/call-log')} className="rounded-full">
                Back to Call Log
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout title="" subtitle="">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-t-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/call-log')}
              className="rounded-full p-3 bg-white/70 backdrop-blur-md border border-white/20 hover:bg-white/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(call.transcription || 'No transcription available')}
                className="rounded-full p-3 bg-white/70 backdrop-blur-md border border-white/20 hover:bg-white/80"
              >
                <Copy className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3 bg-white/70 backdrop-blur-md border border-white/20 hover:bg-white/80"
              >
                <Share className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3 bg-white/70 backdrop-blur-md border border-white/20 hover:bg-white/80"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Call Details */}
            <div className="md:col-span-2">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Call with {call.callerName || call.from}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {call.startTime && new Date(call.startTime).toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {formatDuration(call.duration || 0)}
                </div>
                <Badge variant={call.direction === 'inbound' ? 'default' : 'secondary'}>
                  {call.direction}
                </Badge>
              </div>
              
              {/* Call Summary */}
              {call.summary && (
                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Call Summary</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{call.summary}</p>
                </div>
              )}
            </div>

            {/* Call Stats */}
            <div className="space-y-4">
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Sentiment</span>
                  <Badge className={getSentimentColor(call.sentiment || 'neutral')}>
                    {call.sentiment || 'neutral'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">AI Handled</span>
                  <Badge variant={call.aiHandled ? 'default' : 'secondary'}>
                    {call.aiHandled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                {call.forwarded && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Forwarded to</span>
                    <span className="text-sm text-gray-600">{call.forwardedTo}</span>
                  </div>
                )}
              </div>

              {/* Recording Playback */}
              {call.recordingUrl && (
                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Recording</h3>
                  <Button
                    variant="outline"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-full justify-center gap-2"
                  >
                    {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isPlaying ? 'Stop' : 'Play'} Recording
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversation Breakdown */}
        <div className="bg-white rounded-b-3xl shadow-sm">
          {/* Key Topics & Action Items */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Topics */}
              {call.keyTopics && call.keyTopics.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Key Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {call.keyTopics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {call.actionItems && call.actionItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {call.actionItems.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Timeline */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation Timeline
            </h3>

            {call.conversationBreakdown && call.conversationBreakdown.length > 0 ? (
              <div className="space-y-4">
                {call.conversationBreakdown.map((turn, index) => (
                  <div key={index} className="group">
                    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                      <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getSpeakerIcon(turn.speaker)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {getSpeakerName(turn.speaker, turn.speakerName)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(turn.timestamp)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {turn.sentiment && (
                              <Badge className={`${getSentimentColor(turn.sentiment)} text-xs`}>
                                {turn.sentiment}
                              </Badge>
                            )}
                            {turn.confidence && (
                              <span className="text-xs text-gray-500">
                                {Math.round(turn.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-gray-700 text-sm leading-relaxed">
                          {turn.message}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(turn.message)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversation breakdown available for this call.</p>
                {call.transcription && (
                  <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-left">
                    <h4 className="font-medium text-gray-900 mb-2">Full Transcription</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {call.transcription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppStoreLayout>
  );
}