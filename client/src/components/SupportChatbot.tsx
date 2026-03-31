import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Bot, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  links?: { text: string; url: string }[];
}

interface KnowledgeBase {
  [key: string]: {
    answer: string;
    suggestions?: string[];
    links?: { text: string; url: string }[];
    keywords: string[];
  };
}

const knowledgeBase: KnowledgeBase = {
  'setup': {
    answer: `To set up your AI Call Assistant:

1. **Access Dashboard**: Your system is ready immediately - just access your dashboard through the web browser
2. **AI Configuration**: Go to "AI Config" to customize your greeting and business hours
3. **Add Contacts**: Import contacts using the mobile app sync or manual entry
4. **Setup Routing**: Configure call routing rules in the "Call Routes" section
5. **Test System**: Use the testing features to verify everything works

Your AI assistant comes pre-configured and will start handling calls right away!`,
    keywords: ['setup', 'getting started', 'initial', 'configure', 'first time'],
    suggestions: ['How do I add contacts?', 'How do I configure AI greeting?', 'How do I test the system?'],
    links: [
      { text: 'Complete Setup Guide', url: '/docs/USER_GUIDE.md#getting-started' },
      { text: 'AI Configuration', url: '/docs/USER_GUIDE.md#ai-configuration' }
    ]
  },
  
  'contacts': {
    answer: `Add contacts in three ways:

**Mobile App Sync** (Easiest):
1. Install the AI Call Assistant mobile app
2. Grant contact permissions
3. Tap "Sync Contacts" - all your phone contacts transfer automatically

**File Upload**:
1. Export contacts from your phone as CSV or VCF file
2. Go to Contacts → Import Contacts
3. Upload file and map the fields

**Manual Entry**:
1. Click "Add Contact" in the Contacts section
2. Enter: First Name, Last Name, Phone Number (+1234567890 format)
3. Optionally add: Email, Company, Job Title, VIP status`,
    keywords: ['contacts', 'add contacts', 'import', 'sync', 'phone book'],
    suggestions: ['How do I mark someone as VIP?', 'How do I create routing rules?', 'Can I sync from multiple devices?']
  },

  'vip': {
    answer: `To mark contacts as VIP:

1. Open the contact in your contact list
2. Click "Edit Contact"
3. Check the "VIP" checkbox
4. Save changes

**VIP Benefits**:
- Priority call handling
- Immediate notifications
- Custom greetings
- Special routing rules
- Faster response times

VIP contacts bypass normal routing and get premium treatment automatically.`,
    keywords: ['vip', 'priority', 'important contacts', 'special handling'],
    suggestions: ['How do I set up VIP notifications?', 'How do I create custom greetings?']
  },

  'routing': {
    answer: `Set up call routing in two ways:

**General Routing Rules**:
1. Go to "Call Routes" → "Add Route"
2. Set conditions: Keywords, time, caller type
3. Choose action: Forward, AI handling, voicemail, or block
4. Set priority level (1-10)

**Contact-Specific Routing**:
1. Open contact details
2. Click "Add Routing Rule"
3. Choose action for this specific contact
4. Set business hours conditions

**AI Routing**: The AI automatically analyzes caller intent and routes calls intelligently based on conversation content.`,
    keywords: ['routing', 'call routing', 'forward calls', 'transfer', 'rules'],
    suggestions: ['How does AI routing work?', 'How do I test routing rules?', 'What if no rule matches?']
  },

  'ai-config': {
    answer: `Customize your AI assistant:

**Basic Configuration**:
1. Go to "AI Config" section
2. Edit greeting message (keep under 30 seconds when spoken)
3. Set business hours and timezone
4. Configure after-hours behavior

**Advanced Features**:
- **Intent Recognition**: AI understands caller purpose automatically
- **Smart Responses**: Provides helpful business information
- **Multi-language**: Supports multiple languages automatically
- **Learning**: Improves based on your call patterns

**Example Greeting**: "Hello! You've reached ABC Company. I'm your AI assistant. How can I help you today?"`,
    keywords: ['ai', 'artificial intelligence', 'greeting', 'assistant', 'configure ai'],
    suggestions: ['How do I set business hours?', 'Can AI handle multiple languages?', 'How does AI learn?']
  },

  'mobile-app': {
    answer: `Install and use the mobile app:

**Installation**:
- **iPhone**: App Store → Search "AI Call Assistant" → Install
- **Android**: Google Play → Search "AI Call Assistant" → Install

**Key Features**:
- Contact synchronization (two-way sync)
- Live call monitoring with push notifications
- Remote routing rule management
- Call history and analytics
- Voicemail transcriptions

**Permissions Needed**:
- Contacts (for sync)
- Notifications (for call alerts)
- Storage (for contact backup)

The app works offline for viewing contacts and call history.`,
    keywords: ['mobile', 'app', 'iphone', 'android', 'sync', 'notifications'],
    suggestions: ['How secure is contact sync?', 'Can I use app offline?', 'How do I get call notifications?']
  },

  'notifications': {
    answer: `Set up multiple notification channels:

**SMS Notifications**:
1. Settings → Notifications → Enter mobile number
2. Verify with code sent to your phone
3. Choose which events trigger SMS alerts

**Email Notifications**:
1. Verify your email address
2. Select notification frequency
3. Choose report types (daily, weekly)

**Push Notifications** (Mobile App):
1. Enable in mobile app settings
2. Grant notification permissions
3. Customize alert sounds and frequency

**VIP Notifications**: Get immediate alerts for VIP callers across all channels.`,
    keywords: ['notifications', 'alerts', 'sms', 'email', 'push notifications'],
    suggestions: ['How do I set up VIP alerts?', 'Can I customize notification sounds?', 'How often do I get reports?']
  },

  'troubleshooting': {
    answer: `Common troubleshooting steps:

**Can't See Contacts**:
1. Check if contact sync completed
2. Verify mobile app permissions
3. Refresh browser page
4. Try manual contact import

**AI Not Answering Calls**:
1. Verify phone number integration
2. Check AI configuration
3. Review routing rules
4. Test with sample call

**Notifications Not Working**:
1. Check notification settings
2. Verify contact information
3. Check spam/junk folders
4. Test notification channels

**Emergency Support**: For critical issues, contact emergency@aicallassistant.com`,
    keywords: ['troubleshooting', 'problems', 'issues', 'not working', 'error', 'fix'],
    suggestions: ['How do I contact support?', 'How do I test my setup?', 'Where are the error logs?']
  },

  'security': {
    answer: `Your data is protected with enterprise security:

**Encryption**:
- All data encrypted in transit and at rest
- End-to-end encryption for contact sync
- No data stored on third-party servers

**Privacy Controls**:
- You control what data gets synced
- Easy opt-out and data deletion
- No data sharing with third parties
- GDPR and CCPA compliant

**Access Control**:
- Only you and authorized users can access your data
- Activity logging for all account changes
- Secure authentication required

**Data Deletion**: You can delete individual contacts or your entire account at any time.`,
    keywords: ['security', 'privacy', 'encryption', 'data protection', 'safe', 'secure'],
    suggestions: ['How do I delete my data?', 'Who can access my information?', 'Is contact sync secure?']
  }
};

const quickActions = [
  'How do I add contacts?',
  'How do I set up call routing?',
  'How do I configure the AI?',
  'How do I install the mobile app?',
  'How do I troubleshoot issues?',
  'How secure is my data?'
];

interface SupportChatbotProps {
  onClose?: () => void;
}

export default function SupportChatbot({ onClose }: SupportChatbotProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Hi! I'm your AI Call Assistant support bot. I can help you with:

• Setting up your system
• Managing contacts and routing
• Configuring AI features
• Using the mobile app
• Troubleshooting issues

What would you like to know?`,
      timestamp: new Date(),
      suggestions: quickActions
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findBestMatch = (query: string): string | null => {
    const lowerQuery = query.toLowerCase();
    
    for (const [key, data] of Object.entries(knowledgeBase)) {
      if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
        return key;
      }
    }
    
    return null;
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const match = findBestMatch(text);
      let botResponse: Message;

      if (match && knowledgeBase[match]) {
        const data = knowledgeBase[match];
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: data.answer,
          timestamp: new Date(),
          suggestions: data.suggestions,
          links: data.links
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `I'm not sure about that specific question, but I can help you with:

• **Setup and Configuration**: Getting started, AI settings, business hours
• **Contact Management**: Adding contacts, importing, VIP settings
• **Call Routing**: Setting up rules, forwarding, AI handling
• **Mobile App**: Installation, sync, notifications
• **Troubleshooting**: Common issues and solutions

Try asking about one of these topics, or contact our support team for personalized help.`,
          timestamp: new Date(),
          suggestions: quickActions
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed inset-0 m-4 md:bottom-20 md:right-4 md:left-auto md:top-auto w-full md:w-96 h-[calc(100vh-2rem)] md:h-[600px] shadow-xl z-50 flex flex-col bg-white dark:bg-gray-950">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4 flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Support Assistant
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col px-4 pb-4 pt-0 min-h-0">
        {/* Messages Container - Fixed height with proper scrolling */}
        <div className="flex-1 min-h-0 mb-4">
          <ScrollArea className="h-full w-full">
            <div className="space-y-4 pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 w-full',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg p-3 text-sm break-words',
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {message.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      {message.type === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</div>
                        
                        {message.suggestions && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs opacity-70">Suggested questions:</div>
                            <div className="flex flex-wrap gap-1">
                              {message.suggestions.map((suggestion, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors whitespace-normal text-left"
                                  onClick={() => handleSend(suggestion)}
                                >
                                  {suggestion}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.links && (
                          <div className="mt-3 space-y-1">
                            {message.links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline break-words"
                              >
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                <span className="break-words">{link.text}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>
        
        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your AI Call Assistant..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button 
              onClick={() => handleSend()} 
              size="icon"
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-center text-muted-foreground">
            For complex issues, contact our support team directly
          </div>
        </div>
      </CardContent>
    </Card>
  );
}