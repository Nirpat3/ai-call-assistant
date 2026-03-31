import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Bot, 
  User, 
  Phone, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Volume2,
  Download,
  Copy,
  CheckSquare,
  Tag,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";

export interface ConversationTurn {
  speaker: "caller" | "ai" | "human";
  speakerName?: string;
  message: string;
  timestamp: string;
  confidence?: number;
  sentiment?: "positive" | "negative" | "neutral";
}

interface ConversationChatProps {
  callId?: number;
  conversationBreakdown?: ConversationTurn[];
  transcription?: string;
  sentiment?: string;
  keyTopics?: string[];
  actionItems?: string[];
  summary?: string;
  recordingUrl?: string;
  duration?: number;
  callDate?: Date;
  callerName?: string;
  isExpanded?: boolean;
}

export function ConversationChat({
  callId,
  conversationBreakdown = [],
  transcription,
  sentiment,
  keyTopics = [],
  actionItems = [],
  summary,
  recordingUrl,
  duration,
  callDate,
  callerName,
  isExpanded: initialExpanded = false
}: ConversationChatProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const getSpeakerName = (turn: ConversationTurn) => {
    if (turn.speakerName) return turn.speakerName;
    
    switch (turn.speaker) {
      case "caller":
        return callerName || "Caller";
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

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800";
      case "negative":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyTranscript = () => {
    const fullTranscript = conversationBreakdown.map(turn => 
      `${getSpeakerName(turn)} (${turn.timestamp}): ${turn.message}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(fullTranscript);
  };

  // If no conversation breakdown, create a basic one from transcription
  const displayTurns = conversationBreakdown.length > 0 
    ? conversationBreakdown 
    : transcription 
      ? [{
          speaker: "caller" as const,
          message: transcription,
          timestamp: "0:00",
          sentiment: sentiment as "positive" | "negative" | "neutral" | undefined
        }]
      : [];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Call Conversation</CardTitle>
              {callDate && (
                <p className="text-sm text-gray-600">
                  {format(callDate, 'MMM d, yyyy at h:mm a')} • {formatDuration(duration)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {sentiment && (
              <Badge className={getSentimentColor(sentiment)}>
                {getSentimentIcon(sentiment)}
                <span className="ml-1 capitalize">{sentiment}</span>
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Summary */}
        {!isExpanded && summary && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{summary}</p>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {recordingUrl && (
                <Button variant="outline" size="sm">
                  <Volume2 className="h-4 w-4 mr-2" />
                  {isPlaying ? "Stop" : "Play"} Recording
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={copyTranscript}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Transcript
              </Button>
              
              {recordingUrl && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {displayTurns.length} messages
            </div>
          </div>

          {/* Conversation Messages */}
          <ScrollArea className="h-96 w-full">
            <div className="space-y-4 pr-4">
              {displayTurns.map((turn, index) => (
                <div key={index} className="flex space-x-3">
                  <Avatar className={`h-8 w-8 border ${getSpeakerColor(turn.speaker)}`}>
                    <AvatarFallback className="text-xs">
                      {getSpeakerIcon(turn.speaker)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {getSpeakerName(turn)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {turn.timestamp}
                      </span>
                      {turn.sentiment && (
                        <div className="flex items-center">
                          {getSentimentIcon(turn.sentiment)}
                        </div>
                      )}
                      {turn.confidence && (
                        <span className="text-xs text-gray-400">
                          {Math.round(turn.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-lg ${
                      turn.speaker === 'caller' 
                        ? 'bg-blue-50 border-l-4 border-blue-400' 
                        : turn.speaker === 'ai'
                        ? 'bg-purple-50 border-l-4 border-purple-400'
                        : 'bg-green-50 border-l-4 border-green-400'
                    }`}>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {turn.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Analysis Section */}
          {(keyTopics.length > 0 || actionItems.length > 0) && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Topics */}
                {keyTopics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Key Topics
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {keyTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {actionItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Action Items
                    </h4>
                    <ul className="space-y-2">
                      {actionItems.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Summary */}
          {summary && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Call Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {summary}
                </p>
              </div>
            </>
          )}

          {/* Audio Player */}
          {recordingUrl && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Recording</h4>
                <audio controls className="w-full">
                  <source src={recordingUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}