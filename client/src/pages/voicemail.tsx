import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Phone, 
  Play, 
  Pause, 
  Download, 
  FileText, 
  User, 
  Clock, 
  Copy,
  Eye
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppStoreLayout from "@/components/AppStoreLayout";

// Time formatting utilities
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

const formatUtcToLocal = (utcTimestamp: string, format: 'date' | 'time' | 'datetime' = 'datetime'): string => {
  const date = new Date(utcTimestamp);
  const options: Intl.DateTimeFormatOptions = {};
  
  if (format === 'date' || format === 'datetime') {
    options.year = 'numeric';
    options.month = 'short';
    options.day = 'numeric';
  }
  
  if (format === 'time' || format === 'datetime') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return date.toLocaleDateString('en-US', options);
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface Voicemail {
  id: number;
  callId: number;
  recordingUrl: string;
  transcription: string | null;
  summary: string | null;
  processed: boolean;
  createdAt: string;
  call?: {
    from: string;
    callerName: string | null;
    duration: number | null;
  };
  contact?: any;
  displayName?: string;
  phoneNumber?: string;
}

// Expandable text component for long content
function ExpandableText({ text, maxLength = 100, title }: { text: string; maxLength?: number; title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">{title}</h4>
        <p className="text-sm text-gray-800">{text}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium mb-2">{title}</h4>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <Button
        variant="link"
        size="sm"
        className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800 mt-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Show Less' : 'Read More'}
      </Button>
    </div>
  );
}

export default function VoicemailPage() {
  const [selectedVoicemail, setSelectedVoicemail] = useState<Voicemail | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: voicemails = [], isLoading } = useQuery({
    queryKey: ["/api/voicemails"],
    refetchInterval: 5000,
  });

  const handlePlayPause = (voicemailId: number, recordingUrl: string) => {
    const audio = document.querySelector(`audio[data-id="${voicemailId}"]`) as HTMLAudioElement;
    
    if (playingId === voicemailId) {
      audio?.pause();
      setPlayingId(null);
    } else {
      // Pause any currently playing audio
      if (playingId) {
        const currentAudio = document.querySelector(`audio[data-id="${playingId}"]`) as HTMLAudioElement;
        currentAudio?.pause();
      }
      
      audio?.play();
      setPlayingId(voicemailId);
    }
  };

  const transcribeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/voicemails/transcribe-all', {
        method: 'POST'
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Transcription Started",
        description: "AI transcription has been started for all unprocessed voicemails.",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/voicemails"] });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Transcription Failed",
        description: "Unable to start batch transcription. Please try again.",
        variant: "destructive",
      });
    }
  });

  const unprocessedCount = voicemails.filter(vm => !vm.processed).length;

  if (isLoading) {
    return (
      <AppStoreLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading voicemails...</p>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header - Responsive */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left side - Icon, Title, Count */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-3 sm:p-4 bg-purple-600 rounded-2xl sm:rounded-3xl shadow-lg flex-shrink-0">
                  <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Voicemails</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">
                    {voicemails.length} total voicemails
                    {unprocessedCount > 0 && (
                      <span className="ml-1 sm:ml-2 text-amber-600 font-semibold text-xs sm:text-sm">
                        • {unprocessedCount} processing
                      </span>
                    )}
                  </p>
                </div>
                <div className="inline-flex items-center px-3 py-2 bg-purple-100 rounded-xl flex-shrink-0">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs sm:text-sm font-semibold text-purple-700">{voicemails.length} messages</span>
                </div>
              </div>
              
              {/* Right side - Action buttons */}
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <Button
                  onClick={() => transcribeAllMutation.mutate()}
                  disabled={unprocessedCount === 0 || transcribeAllMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Transcribe All
                </Button>
              </div>
            </div>
            {unprocessedCount > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-700 font-medium">
                  AI is automatically transcribing {unprocessedCount} voicemail{unprocessedCount > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Voicemail Cards */}
        <div className="space-y-4">
          {voicemails.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No voicemails yet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Voicemails will appear here when callers leave messages
                </p>
              </CardContent>
            </Card>
          ) : (
            voicemails.map((voicemail) => {
              const getVoicemailColors = (processed: boolean) => {
                if (processed) return 'bg-white border-gray-200 shadow-sm';
                return 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-md';
              };

              const getIconBackground = (processed: boolean) => {
                return processed ? 'bg-blue-100' : 'bg-amber-100';
              };

              return (
                <Card
                  key={voicemail.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md border rounded-2xl ${getVoicemailColors(voicemail.processed)}`}
                  onClick={() => setSelectedVoicemail(voicemail)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-2xl ${getIconBackground(voicemail.processed)}`}>
                          <Phone className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {voicemail.callerName || 'Unknown Caller'}
                            </h4>
                            <Badge className={voicemail.processed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                              <FileText className="h-3 w-3 mr-1" />
                              {voicemail.processed ? 'Transcribed' : 'Processing'}
                            </Badge>
                            {!voicemail.processed && (
                              <div className="w-3 h-3 bg-amber-600 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-base text-gray-700 mb-3">
                            {voicemail.phoneNumber || voicemail.call?.from} • {formatRelativeTime(voicemail.createdAt)}
                          </p>
                          
                          {/* Voicemail Summary */}
                          {voicemail.summary && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
                              <h5 className="font-medium text-gray-900 mb-2">Voicemail Summary</h5>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {voicemail.summary}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatUtcToLocal(voicemail.createdAt, 'time')}
                            </span>
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {voicemail.phoneNumber || voicemail.call?.from}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center space-x-2 sm:space-x-3 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // setCurrentlyPlaying(currentlyPlaying === voicemail.id ? null : voicemail.id);
                          }}
                          className="flex-1 hover:bg-blue-50 hover:border-blue-300 rounded-xl"
                        >
                          <Play className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Play</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/voicemails/${voicemail.id}/audio`, '_blank');
                          }}
                          className="text-green-600 hover:bg-green-50 hover:border-green-300 rounded-xl px-3 sm:px-4"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline sm:ml-2">Download</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVoicemail(voicemail);
                          }}
                          className="text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-xl px-3 sm:px-4"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline sm:ml-2">View</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
        {/* Voicemail Details Dialog */}
        {selectedVoicemail && (
          <Dialog open={!!selectedVoicemail} onOpenChange={() => setSelectedVoicemail(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Voicemail Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Caller Information */}
                <div>
                  <h3 className="font-medium mb-3">Caller Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedVoicemail.displayName || selectedVoicemail.call?.callerName || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedVoicemail.phoneNumber || selectedVoicemail.call?.from || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatUtcToLocal(selectedVoicemail.createdAt, 'date')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{formatUtcToLocal(selectedVoicemail.createdAt, 'time')}</span>
                    </div>
                    {selectedVoicemail.call?.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{formatDuration(selectedVoicemail.call.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcription and Summary */}
                {selectedVoicemail.processed && (
                  <div className="space-y-4">
                    {selectedVoicemail.summary && (
                      <div>
                        <h3 className="font-medium mb-3">Summary</h3>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-gray-800">{selectedVoicemail.summary}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedVoicemail.transcription && (
                      <div>
                        <h3 className="font-medium mb-3">Full Transcription</h3>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          <p className="text-gray-800 whitespace-pre-wrap">{selectedVoicemail.transcription}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayPause(selectedVoicemail.id, selectedVoicemail.recordingUrl)}
                    >
                      {playingId === selectedVoicemail.id ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {playingId === selectedVoicemail.id ? "Pause" : "Play"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedVoicemail.recordingUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  {selectedVoicemail.transcription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedVoicemail.transcription || '');
                        toast({
                          title: "Copied to clipboard",
                          description: "Transcription has been copied to your clipboard.",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Transcription
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
    </AppStoreLayout>
  );
}