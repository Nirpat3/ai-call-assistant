import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, X, Mic, MicOff, Wand2, Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SMSComposerProps {
  recipientPhone?: string;
  recipientName?: string;
  contactId?: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SMSComposer({ 
  recipientPhone = "", 
  recipientName = "", 
  contactId,
  trigger,
  onSuccess 
}: SMSComposerProps) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(recipientPhone);
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; organizationId?: string }) => {
      return apiRequest("/api/sms/send", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: `Message sent successfully to ${phoneNumber}`,
      });
      
      // Clear form
      setMessage("");
      if (!recipientPhone) {
        setPhoneNumber("");
      }
      
      // Close dialog
      setOpen(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/sms"] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "sms"] });
      }
      
      // Call success callback
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send SMS",
        description: error.message || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Voice transcription mutation
  const transcribeAudioMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.wav');
      
      return apiRequest("/api/sms/transcribe", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data: { text: string }) => {
      setTranscribedText(data.text);
      setMessage(prev => prev + (prev ? " " : "") + data.text);
      setIsTranscribing(false);
      toast({
        title: "Voice Transcribed",
        description: "Your voice has been converted to text successfully",
      });
    },
    onError: (error: any) => {
      setIsTranscribing(false);
      toast({
        title: "Transcription Failed",
        description: error.message || "Could not transcribe your voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI enhancement mutation
  const enhanceMessageMutation = useMutation({
    mutationFn: async (data: { text: string; context?: string }) => {
      return apiRequest("/api/sms/enhance", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data: { enhanced: string; suggestions: string[] }) => {
      setMessage(data.enhanced);
      setAiSuggestions(data.suggestions);
      setIsAiEnhancing(false);
      toast({
        title: "Message Enhanced",
        description: "AI has improved your message with better clarity and tone",
      });
    },
    onError: (error: any) => {
      setIsAiEnhancing(false);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Could not enhance your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsTranscribing(true);
        transcribeAudioMutation.mutate(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Speak your message now...",
      });
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const enhanceMessage = () => {
    if (!message.trim()) {
      toast({
        title: "No Message",
        description: "Please enter a message to enhance",
        variant: "destructive",
      });
      return;
    }

    setIsAiEnhancing(true);
    enhanceMessageMutation.mutate({
      text: message,
      context: recipientName ? `Sending to ${recipientName}` : undefined,
    });
  };

  const applySuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setAiSuggestions([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to send the message to.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }

    sendSMSMutation.mutate({
      to: phoneNumber.trim(),
      message: message.trim(),
      organizationId: undefined, // TODO: Get from user context
    });
  };

  const characterCount = message.length;
  const maxCharacters = 160;
  const segmentCount = Math.ceil(characterCount / maxCharacters);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Send SMS
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send SMS Message
          </DialogTitle>
          <DialogDescription>
            {recipientName ? `Send a text message to ${recipientName}` : "Send a text message"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!!recipientPhone}
              className="font-mono"
            />
          </div>

          {/* Voice Recording Section */}
          {(isRecording || isTranscribing) && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isRecording ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <Volume2 className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Recording: {formatTime(recordingTime)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-sm font-medium">Transcribing voice...</span>
                    </div>
                  )}
                </div>
                {isRecording && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                    className="gap-2"
                  >
                    <MicOff className="w-3 h-3" />
                    Stop
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className="gap-2"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      Voice Input
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={enhanceMessage}
                  disabled={isAiEnhancing || !message.trim()}
                  className="gap-2"
                >
                  {isAiEnhancing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  AI Enhance
                </Button>
              </div>
            </div>
            
            <Textarea
              id="message"
              placeholder="Type your message here or use voice input..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
              disabled={isRecording || isTranscribing}
            />
            
            {/* Transcribed text preview */}
            {transcribedText && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Voice Transcription:</span>
                </div>
                <p className="text-sm text-green-700 italic">"{transcribedText}"</p>
              </div>
            )}
            
            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">AI Suggestions:</span>
                </div>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="text-xs h-auto p-2 whitespace-pre-wrap text-left"
                      >
                        {suggestion}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Character count and segments */}
            <div className="flex justify-between text-sm text-gray-500">
              <span>
                {characterCount}/{maxCharacters * 6} characters
              </span>
              <span>
                {segmentCount} segment{segmentCount !== 1 ? 's' : ''}
                {segmentCount > 1 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    ${(segmentCount * 0.75).toFixed(2)}
                  </Badge>
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={sendSMSMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sendSMSMutation.isPending || !phoneNumber.trim() || !message.trim()}
              className="gap-2"
            >
              {sendSMSMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick SMS Card for dashboard or quick access
export function QuickSMSCard() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; organizationId?: string }) => {
      return apiRequest("/api/sms/send", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: `Message sent successfully to ${phoneNumber}`,
      });
      
      // Clear form
      setMessage("");
      setPhoneNumber("");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/sms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send SMS",
        description: error.message || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both a phone number and message.",
        variant: "destructive",
      });
      return;
    }

    sendSMSMutation.mutate({
      to: phoneNumber.trim(),
      message: message.trim(),
      organizationId: undefined,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Quick SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quick-phone">Phone Number</Label>
          <Input
            id="quick-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-message">Message</Label>
          <Textarea
            id="quick-message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <div className="text-sm text-gray-500 text-right">
            {message.length}/500
          </div>
        </div>

        <Button 
          onClick={handleSend}
          disabled={sendSMSMutation.isPending || !phoneNumber.trim() || !message.trim()}
          className="w-full gap-2"
        >
          {sendSMSMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send SMS
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}