import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Phone, Mail, Building, MapPin, Clock, MessageSquare, ArrowLeft, Edit, Save, X, Voicemail, Star, Shield, ShieldX, UserX, Heart, Share, MoreHorizontal, Calendar, User, ExternalLink, PlayCircle, Download, Mic, Plus, Trash2, Globe, Home, Briefcase, UserPlus, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface ContactField {
  id: string;
  label: string;
  value: string;
  type: string;
}

interface Contact {
  id: number;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  phoneNumbers: ContactField[];
  emails: ContactField[];
  addresses: ContactField[];
  websites: ContactField[];
  company: string | null;
  department: string | null;
  jobTitle: string | null;
  address: string | null;
  notes: string | null;
  isVip: boolean;
  isSpam: boolean;
  tags: string[];
  socialMedia: Record<string, string> | null;
  lastContactDate: Date | null;
  callFrequency: number;
  preferredContactMethod: string | null;
  timezone: string | null;
  birthdate: Date | null;
  anniversary: Date | null;
  customFields: Record<string, string> | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Call {
  id: number;
  callSid: string;
  from: string;
  to: string;
  status: string;
  duration: number | null;
  startTime: Date | null;
  endTime: Date | null;
  recordingUrl: string | null;
  transcription: string | null;
  summary: string | null;
  sentiment: string | null;
  keyTopics: string[];
  actionItems: string[];
  callerName: string | null;
  aiHandled: boolean;
  transferTo: string | null;
  notes: string | null;
  conversationBreakdown: any[];
  createdAt: Date;
}

interface Voicemail {
  id: number;
  callId: number | null;
  phoneNumber: string;
  callerName: string | null;
  duration: number | null;
  transcription: string | null;
  recordingUrl: string;
  isUrgent: boolean;
  sentiment: string | null;
  keyTopics: string[];
  summary: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export default function ContactProfile() {
  const [, params] = useRoute("/contact/:id");
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const contactId = params?.id ? parseInt(params.id) : null;

  // Helper functions for managing contact fields
  const generateFieldId = () => Math.random().toString(36).substr(2, 9);

  const addField = (fieldType: 'phoneNumbers' | 'emails' | 'addresses' | 'websites') => {
    const newField: ContactField = {
      id: generateFieldId(),
      label: getDefaultLabel(fieldType),
      value: '',
      type: fieldType
    };
    
    setEditData(prev => ({
      ...prev,
      [fieldType]: [...(prev[fieldType] || []), newField]
    }));
  };

  const removeField = (fieldType: 'phoneNumbers' | 'emails' | 'addresses' | 'websites', fieldId: string) => {
    setEditData(prev => ({
      ...prev,
      [fieldType]: (prev[fieldType] || []).filter((field: ContactField) => field.id !== fieldId)
    }));
  };

  const updateField = (fieldType: 'phoneNumbers' | 'emails' | 'addresses' | 'websites', fieldId: string, updates: Partial<ContactField>) => {
    setEditData(prev => ({
      ...prev,
      [fieldType]: (prev[fieldType] || []).map((field: ContactField) => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const getDefaultLabel = (fieldType: string) => {
    const defaults = {
      phoneNumbers: 'mobile',
      emails: 'home', 
      addresses: 'home',
      websites: 'homepage'
    };
    return defaults[fieldType as keyof typeof defaults] || 'other';
  };

  const getLabelOptions = (fieldType: string) => {
    const options = {
      phoneNumbers: ['mobile', 'home', 'work', 'main', 'other'],
      emails: ['home', 'work', 'school', 'other'],
      addresses: ['home', 'work', 'school', 'other'],
      websites: ['homepage', 'work', 'blog', 'profile', 'other']
    };
    return options[fieldType as keyof typeof options] || ['other'];
  };

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

  // Fetch contact data
  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId,
  });

  // Fetch related calls
  const { data: calls = [] } = useQuery<Call[]>({
    queryKey: [`/api/calls/recent`],
  });

  // Fetch related voicemails
  const { data: voicemails = [] } = useQuery<Voicemail[]>({
    queryKey: [`/api/voicemails`],
  });

  // Filter calls and voicemails for this contact  
  const contactCalls = calls.filter(call => {
    const phoneNumbers = contact?.phoneNumbers || [];
    if (Array.isArray(phoneNumbers)) {
      // Handle legacy string array format
      return phoneNumbers.some(phone => phone === call.from || phone === call.to);
    } else {
      // Handle new ContactField array format
      return phoneNumbers.some((field: ContactField) => field.value === call.from || field.value === call.to);
    }
  });

  const contactVoicemails = voicemails.filter(vm => {
    const phoneNumbers = contact?.phoneNumbers || [];
    if (Array.isArray(phoneNumbers)) {
      // Handle legacy string array format
      return phoneNumbers.some(phone => phone === vm.phoneNumber);
    } else {
      // Handle new ContactField array format
      return phoneNumbers.some((field: ContactField) => field.value === vm.phoneNumber);
    }
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      return await apiRequest(`/api/contacts/${contactId}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
      setIsEditing(false);
      toast({
        title: "Contact Updated",
        description: "Contact information has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (contact && !isEditing) {
      // Transform legacy data format to new ContactField format for editing
      const transformedContact = {
        ...contact,
        phoneNumbers: Array.isArray(contact.phoneNumbers) && contact.phoneNumbers.length > 0 && typeof contact.phoneNumbers[0] === 'string'
          ? contact.phoneNumbers.map((phone: string, index: number) => ({
              id: generateFieldId(),
              label: index === 0 ? 'mobile' : 'home',
              value: phone,
              type: 'phoneNumbers'
            }))
          : contact.phoneNumbers || [],
        emails: contact.email ? [{
          id: generateFieldId(),
          label: 'home',
          value: contact.email,
          type: 'emails'
        }] : [],
        addresses: contact.address ? [{
          id: generateFieldId(),
          label: 'home',
          value: contact.address,
          type: 'addresses'
        }] : [],
        websites: []
      };
      setEditData(transformedContact);
    }
  }, [contact, isEditing]);

  if (isLoading) {
    return (
      <AppStoreLayout title="Contact Profile" subtitle="Loading contact information...">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-2xl"></div>
              <div className="h-96 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  if (!contact) {
    return (
      <AppStoreLayout title="Contact Not Found" subtitle="The requested contact could not be found">
        <div className="p-6 max-w-6xl mx-auto">
          <Card className="text-center p-8 rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
            <CardContent>
              <UserX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Not Found</h3>
              <p className="text-gray-600 mb-6">The contact you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => setLocation('/contacts')} className="rounded-full">
                Back to Contacts
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppStoreLayout>
    );
  }

  const getContactInitials = () => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
    }
    if (contact.displayName) {
      const parts = contact.displayName.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
    }
    return contact.phoneNumbers?.[0]?.[0] || '?';
  };

  const getContactName = () => {
    if (contact.displayName) return contact.displayName;
    if (contact.firstName && contact.lastName) return `${contact.firstName} ${contact.lastName}`;
    if (contact.firstName) return contact.firstName;
    return contact.phoneNumbers?.[0] || 'Unknown Contact';
  };

  const handleSave = () => {
    updateContactMutation.mutate(editData);
  };

  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return target.toLocaleDateString();
  };

  return (
    <AppStoreLayout title="" subtitle="">
      <div className="max-w-4xl mx-auto">
        {/* Social Media Style Header */}
        <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-t-3xl">
          {/* Cover Photo Area */}
          <div className="h-48 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-t-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            {/* Navigation */}
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between items-center z-10">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/contacts')}
                className="rounded-full p-2 sm:p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="ghost"
                  className="rounded-full p-2 sm:p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
                >
                  <Share className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="rounded-full p-2 sm:p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
                  disabled={updateContactMutation.isPending}
                >
                  {isEditing ? <Save className="w-4 h-4 sm:w-5 sm:h-5" /> : <Edit className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full p-2 sm:p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
                >
                  <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="relative px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Profile Picture */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-16 mb-4 gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-2xl">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-xl sm:text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getContactInitials()}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 bg-green-500 border-2 sm:border-4 border-white rounded-full"></div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 sm:space-x-3 sm:mb-4">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 sm:px-6 text-sm sm:text-base"
                  onClick={() => window.location.href = `tel:${contact.phoneNumbers?.[0]}`}
                >
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Call
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-300 rounded-2xl px-4 sm:px-6 text-sm sm:text-base"
                  onClick={() => window.location.href = `mailto:${contact.email}`}
                >
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Email
                </Button>
              </div>
            </div>

            {/* Name and Bio */}
            <div className="space-y-2">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={editData.firstName || ''}
                      onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                      placeholder="First Name"
                      className="bg-white border-gray-200 rounded-2xl"
                    />
                    <Input
                      value={editData.lastName || ''}
                      onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                      placeholder="Last Name"
                      className="bg-white border-gray-200 rounded-2xl"
                    />
                  </div>
                  <Input
                    value={editData.company || ''}
                    onChange={(e) => setEditData({...editData, company: e.target.value})}
                    placeholder="Company"
                    className="bg-white border-gray-200 rounded-2xl"
                  />
                  <Input
                    value={editData.jobTitle || ''}
                    onChange={(e) => setEditData({...editData, jobTitle: e.target.value})}
                    placeholder="Job Title"
                    className="bg-white border-gray-200 rounded-2xl"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 line-clamp-2">{getContactName()}</h1>
                  {contact.jobTitle && (
                    <p className="text-base sm:text-lg text-gray-600 line-clamp-1">{contact.jobTitle}</p>
                  )}
                  {contact.company && (
                    <p className="text-sm sm:text-base text-gray-500 flex items-center mt-1 line-clamp-1">
                      <Building className="w-4 h-4 mr-1" />
                      {contact.company}
                    </p>
                  )}
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {contact.isVip && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-full px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
                {contact.isSpam && (
                  <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 rounded-full px-3 py-1">
                    <ShieldX className="w-3 h-3 mr-1" />
                    Spam
                  </Badge>
                )}
                {contact.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700 border-0 rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Contact Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{contactCalls.length}</p>
                  <p className="text-xs sm:text-sm text-gray-500">Calls</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{contactVoicemails.length}</p>
                  <p className="text-xs sm:text-sm text-gray-500">Voicemails</p>
                </div>
                <div className="text-center">
                  <p className="text-base sm:text-2xl font-bold text-gray-900 line-clamp-1">
                    {contact.lastContactDate ? formatRelativeTime(contact.lastContactDate) : 'Never'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Last Contact</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Style Content Tabs */}
        <div className="bg-white rounded-b-3xl shadow-lg">
          <Tabs defaultValue="activity" className="w-full">
            <div className="w-full overflow-x-auto border-b border-gray-100">
              <TabsList className="flex w-max min-w-full justify-start lg:justify-center bg-white border-0 rounded-none p-0">
                <TabsTrigger 
                  value="activity" 
                  className="border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0"
                >
                  <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Activity</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="calls" 
                  className="border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0"
                >
                  <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Calls ({contactCalls.length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="voicemails" 
                  className="border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0"
                >
                  <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <Voicemail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Messages ({contactVoicemails.length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="border-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 sm:py-4 px-4 sm:px-6 flex-shrink-0"
                >
                  <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Details</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

          {/* Activity Feed - Social Media Style */}
          <TabsContent value="activity" className="p-0">
            <div className="space-y-4 p-4">
              {[...contactCalls, ...contactVoicemails]
                .sort((a, b) => {
                  const aTime = 'startTime' in a ? a.startTime : a.createdAt;
                  const bTime = 'startTime' in b ? b.startTime : b.createdAt;
                  return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
                })
                .slice(0, 10)
                .map((item, index) => (
                  <div key={index} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                    {'callSid' in item ? (
                      // Call Activity Post
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Phone className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-gray-900">{getContactName()}</p>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-500">
                                {item.startTime ? formatRelativeTime(item.startTime) : 'Unknown time'}
                              </p>
                            </div>
                            <p className="text-gray-700 mt-1">
                              {item.direction === 'inbound' ? 'Called you' : 'You called them'} • {item.status}
                              {item.duration && ` • ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                            </p>
                            {item.summary && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-700">{item.summary}</p>
                              </div>
                            )}
                            {item.recordingUrl && (
                              <div className="mt-3 flex items-center space-x-2">
                                <Button variant="outline" size="sm" className="rounded-full">
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Play Recording
                                </Button>
                                <Button variant="ghost" size="sm" className="rounded-full">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Voicemail Activity Post
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Mic className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-gray-900">{getContactName()}</p>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-500">
                                {formatRelativeTime(item.createdAt)}
                              </p>
                            </div>
                            <p className="text-gray-700 mt-1">
                              Left a voicemail
                              {item.duration && ` • ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                            </p>
                            {item.transcription && (
                              <div className="mt-3 p-3 bg-purple-50 rounded-xl">
                                <p className="text-sm text-gray-700">"{item.transcription}"</p>
                              </div>
                            )}
                            <div className="mt-3 flex items-center space-x-2">
                              <Button variant="outline" size="sm" className="rounded-full">
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Play Message
                              </Button>
                              <Button variant="ghost" size="sm" className="rounded-full">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              
              {[...contactCalls, ...contactVoicemails].length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No activity yet</p>
                  <p className="text-sm text-gray-400">Call history and voicemails will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calls" className="p-4 space-y-4">
            {contactCalls.length > 0 ? (
              contactCalls.map((call) => (
                <Card key={call.id} className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-white to-blue-50/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold">{call.from} → {call.to}</p>
                          <p className="text-sm text-gray-500">
                            {call.startTime ? formatRelativeTime(call.startTime) : 'Unknown time'}
                          </p>
                        </div>
                      </div>
                      <Badge className={`rounded-full ${
                        call.status === 'completed' ? 'bg-green-100 text-green-800' :
                        call.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status}
                      </Badge>
                    </div>
                    
                    {call.summary && (
                      <p className="text-gray-700 mb-3">{call.summary}</p>
                    )}
                    
                    {call.transcription && (
                      <div className="bg-gray-50 rounded-2xl p-4 mt-3">
                        <h4 className="font-medium mb-2">Call Transcription</h4>
                        <p className="text-gray-700 text-sm">{call.transcription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50">
                <CardContent className="text-center py-12">
                  <Phone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Calls Found</h3>
                  <p className="text-gray-600">This contact hasn't made or received any calls yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voicemails" className="space-y-4">
            {contactVoicemails.length > 0 ? (
              contactVoicemails.map((voicemail) => (
                <Card key={voicemail.id} className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-white to-purple-50/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Voicemail className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-semibold">{voicemail.callerName || voicemail.phoneNumber}</p>
                          <p className="text-sm text-gray-500">
                            {formatRelativeTime(voicemail.createdAt)}
                          </p>
                        </div>
                      </div>
                      {voicemail.isUrgent && (
                        <Badge className="bg-red-100 text-red-800 rounded-full">Urgent</Badge>
                      )}
                    </div>
                    
                    {voicemail.summary && (
                      <p className="text-gray-700 mb-3">{voicemail.summary}</p>
                    )}
                    
                    {voicemail.transcription && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h4 className="font-medium mb-2">Transcription</h4>
                        <p className="text-gray-700">{voicemail.transcription}</p>
                      </div>
                    )}
                    
                    {voicemail.recordingUrl && (
                      <div className="mt-4">
                        <audio controls className="w-full">
                          <source src={voicemail.recordingUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50">
                <CardContent className="text-center py-12">
                  <Voicemail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Voicemails Found</h3>
                  <p className="text-gray-600">This contact hasn't left any voicemails yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50/30">
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <Input
                        value={editData.email || ''}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                        placeholder="email@example.com"
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                      <Input
                        value={editData.jobTitle || ''}
                        onChange={(e) => setEditData({...editData, jobTitle: e.target.value})}
                        placeholder="Job Title"
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <Input
                        value={editData.address || ''}
                        onChange={(e) => setEditData({...editData, address: e.target.value})}
                        placeholder="Full Address"
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <Textarea
                        value={editData.notes || ''}
                        onChange={(e) => setEditData({...editData, notes: e.target.value})}
                        placeholder="Additional notes about this contact..."
                        className="rounded-2xl"
                        rows={4}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {contact.email && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{contact.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {contact.address && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium">{contact.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {contact.jobTitle && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                        <Building className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Job Title</p>
                          <p className="font-medium">{contact.jobTitle}</p>
                        </div>
                      </div>
                    )}
                    
                    {contact.notes && (
                      <div className="md:col-span-2 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-2">Notes</p>
                        <p className="text-gray-900">{contact.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppStoreLayout>
  );
}