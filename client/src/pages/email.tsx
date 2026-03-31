import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Send, 
  Inbox, 
  Archive, 
  Trash2, 
  Star, 
  Reply, 
  ReplyAll, 
  Forward,
  Settings,
  Plus,
  Search,
  Filter,
  Paperclip,
  Clock,
  User,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";
import { format, formatDistanceToNow } from "date-fns";

interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  timestamp: Date;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
  attachments?: { name: string; size: number; url: string }[];
  threadId?: string;
  labels?: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'follow-up' | 'welcome' | 'support' | 'sales' | 'custom';
}

export default function EmailPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    template: ''
  });

  // Mock email data
  const { data: emails = [], isLoading } = useQuery<EmailMessage[]>({
    queryKey: ["/api/emails", currentFolder],
    initialData: [
      {
        id: '1',
        from: 'john@acme.com',
        to: ['admin@aicallagent.com'],
        subject: 'Interest in AI Call Assistant Demo',
        body: 'Hi there,\n\nI saw your AI Call Assistant and would love to schedule a demo. We\'re a growing company that could benefit from automated call handling.\n\nBest regards,\nJohn Smith',
        timestamp: new Date(2025, 0, 25, 14, 30),
        isRead: false,
        isStarred: true,
        folder: 'inbox',
        threadId: 'thread-1'
      },
      {
        id: '2',
        from: 'sarah@techcorp.com',
        to: ['admin@aicallagent.com'],
        subject: 'Question about Integration Options',
        body: 'Hello,\n\nWe\'re evaluating your AI Call Assistant for our business. Could you provide more details about integration with our existing CRM system?\n\nThanks,\nSarah Johnson',
        timestamp: new Date(2025, 0, 24, 11, 15),
        isRead: true,
        isStarred: false,
        folder: 'inbox',
        threadId: 'thread-2'
      },
      {
        id: '3',
        from: 'admin@aicallagent.com',
        to: ['john@acme.com'],
        subject: 'Re: Interest in AI Call Assistant Demo',
        body: 'Hi John,\n\nThank you for your interest! I\'d be happy to schedule a demo. We have availability this week for a 30-minute session.\n\nPlease let me know what works best for your schedule.\n\nBest regards,\nAI Call Assistant Team',
        timestamp: new Date(2025, 0, 25, 15, 0),
        isRead: true,
        isStarred: false,
        folder: 'sent',
        threadId: 'thread-1'
      }
    ]
  });

  // Mock email templates
  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email/templates"],
    initialData: [
      {
        id: '1',
        name: 'Demo Follow-up',
        subject: 'Thank you for your interest in our AI Call Assistant',
        body: 'Hi {{name}},\n\nThank you for scheduling a demo with us. We\'re excited to show you how our AI Call Assistant can help streamline your business communications.\n\nBest regards,\nThe AI Assistant Team',
        type: 'follow-up'
      },
      {
        id: '2',
        name: 'Welcome Email',
        subject: 'Welcome to AI Call Assistant!',
        body: 'Welcome to AI Call Assistant!\n\nWe\'re thrilled to have you on board. To get started, please complete your setup in the dashboard.\n\nIf you have any questions, don\'t hesitate to reach out.\n\nBest regards,\nThe AI Assistant Team',
        type: 'welcome'
      }
    ]
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      return await apiRequest("/api/emails/send", {
        method: "POST",
        body: JSON.stringify(emailData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      setShowCompose(false);
      setComposeForm({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        template: ''
      });
      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully."
      });
    }
  });

  const handleSendEmail = () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) {
      toast({
        title: "Missing Information",
        description: "Please fill in recipient, subject, and message.",
        variant: "destructive"
      });
      return;
    }

    sendEmailMutation.mutate({
      to: composeForm.to.split(',').map(email => email.trim()),
      cc: composeForm.cc ? composeForm.cc.split(',').map(email => email.trim()) : [],
      bcc: composeForm.bcc ? composeForm.bcc.split(',').map(email => email.trim()) : [],
      subject: composeForm.subject,
      body: composeForm.body
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body,
        template: templateId
      }));
    }
  };

  const filteredEmails = emails.filter(email => 
    email.folder === currentFolder &&
    (searchQuery === '' || 
     email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
     email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
     email.body.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unreadCount = emails.filter(email => !email.isRead && email.folder === 'inbox').length;

  const getFolderIcon = (folder: string) => {
    switch (folder) {
      case 'inbox': return <Inbox className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'drafts': return <Mail className="h-4 w-4" />;
      case 'archive': return <Archive className="h-4 w-4" />;
      case 'trash': return <Trash2 className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8 text-blue-600" />
              Email
            </h1>
            <p className="text-muted-foreground">Manage customer communications and automations</p>
          </div>
          <Button 
            onClick={() => setShowCompose(true)}
            className="w-full sm:w-auto"
            data-testid="button-compose"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Folders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { key: 'inbox', label: 'Inbox', count: unreadCount },
                  { key: 'sent', label: 'Sent', count: 0 },
                  { key: 'drafts', label: 'Drafts', count: 0 },
                  { key: 'archive', label: 'Archive', count: 0 },
                  { key: 'trash', label: 'Trash', count: 0 }
                ].map((folder) => (
                  <button
                    key={folder.key}
                    onClick={() => setCurrentFolder(folder.key as any)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      currentFolder === folder.key 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'hover:bg-gray-100'
                    }`}
                    data-testid={`folder-${folder.key}`}
                  >
                    <div className="flex items-center gap-2">
                      {getFolderIcon(folder.key)}
                      <span className="font-medium">{folder.label}</span>
                    </div>
                    {folder.count > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {folder.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="messages" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
              </TabsList>

              {/* Messages */}
              <TabsContent value="messages" className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-emails"
                  />
                </div>

                {/* Email List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize">{currentFolder}</CardTitle>
                      <div className="text-sm text-gray-600">
                        {filteredEmails.length} message{filteredEmails.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredEmails.length === 0 ? (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails found</h3>
                        <p className="text-gray-600">
                          {searchQuery ? 'No emails match your search criteria.' : `Your ${currentFolder} is empty.`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredEmails.map((email) => (
                          <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                              !email.isRead ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                            }`}
                            data-testid={`email-${email.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`font-semibold ${!email.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {email.from}
                                  </div>
                                  {email.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                                  {!email.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                                </div>
                                <div className={`font-medium mb-1 ${!email.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {email.subject}
                                </div>
                                <div className="text-sm text-gray-600 line-clamp-2">
                                  {email.body}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 ml-4">
                                {formatDistanceToNow(email.timestamp, { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates */}
              <TabsContent value="templates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Email Templates</CardTitle>
                        <CardDescription>Pre-written templates for common scenarios</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setShowCompose(true);
                            handleTemplateSelect(template.id);
                          }}
                          data-testid={`template-${template.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">{template.name}</div>
                            <Badge variant="outline" className="capitalize">
                              {template.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{template.subject}</div>
                          <div className="text-sm text-gray-500 line-clamp-2">{template.body}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Automation */}
              <TabsContent value="automation" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Auto-Responders</CardTitle>
                      <CardDescription>Automatic email responses</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Demo Request Response</div>
                          <div className="text-sm text-gray-600">Auto-reply to demo inquiries</div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Active
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Support Ticket Confirmation</div>
                          <div className="text-sm text-gray-600">Confirm support request received</div>
                        </div>
                        <Badge variant="outline">
                          Inactive
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Email Sequences</CardTitle>
                      <CardDescription>Automated follow-up campaigns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Trial User Nurture</div>
                          <div className="text-sm text-gray-600">5-day email sequence for trial users</div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Customer Onboarding</div>
                          <div className="text-sm text-gray-600">Welcome series for new customers</div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Compose Email Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Compose Email</CardTitle>
                <CardDescription>Send a new email message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template">Use Template (Optional)</Label>
                  <Select
                    value={composeForm.template}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    value={composeForm.to}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="recipient@example.com"
                    data-testid="input-email-to"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cc">CC</Label>
                    <Input
                      id="cc"
                      value={composeForm.cc}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, cc: e.target.value }))}
                      placeholder="cc@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bcc">BCC</Label>
                    <Input
                      id="bcc"
                      value={composeForm.bcc}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, bcc: e.target.value }))}
                      placeholder="bcc@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject"
                    data-testid="input-email-subject"
                  />
                </div>
                
                <div>
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    value={composeForm.body}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={8}
                    data-testid="textarea-email-body"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendEmailMutation.isPending}
                    className="flex-1"
                    data-testid="button-send-email"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCompose(false)}
                    data-testid="button-cancel-email"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Detail Modal */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedEmail.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      From: {selectedEmail.from}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedEmail.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                      ×
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <div>To: {selectedEmail.to.join(', ')}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      {format(selectedEmail.timestamp, 'PPP p')}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="whitespace-pre-wrap text-gray-900">{selectedEmail.body}</div>
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button variant="outline" size="sm">
                      <ReplyAll className="h-4 w-4 mr-2" />
                      Reply All
                    </Button>
                    <Button variant="outline" size="sm">
                      <Forward className="h-4 w-4 mr-2" />
                      Forward
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppStoreLayout>
  );
}