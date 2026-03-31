import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Phone, Mail, Building, MapPin, Clock, MessageSquare, ArrowLeft, Edit, Save, X, Voicemail, Star, Shield, ShieldX, UserX, Heart, Share, MoreHorizontal, Calendar, User, ExternalLink, PlayCircle, Download, Mic, Plus, Trash2, Globe, Home, Briefcase, UserPlus, Copy, Tag, Users, FolderOpen } from "lucide-react";
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
import { SMSComposer } from "@/components/SMSComposer";

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
  phoneNumbers: string[];
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

export default function ContactProfile() {
  const [, params] = useRoute("/contact/:id");
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<ContactField[]>([]);
  const [emails, setEmails] = useState<ContactField[]>([]);
  const [addresses, setAddresses] = useState<ContactField[]>([]);
  const [websites, setWebsites] = useState<ContactField[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newGroup, setNewGroup] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const contactId = params?.id ? parseInt(params.id) : null;

  // Helper functions
  const generateFieldId = () => Math.random().toString(36).substr(2, 9);

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

  const addField = (type: 'phone' | 'email' | 'address' | 'website') => {
    const fieldConfig = {
      phone: { 
        setter: setPhoneNumbers, 
        getter: phoneNumbers,
        defaultLabel: 'mobile',
        defaultValue: ''
      },
      email: { 
        setter: setEmails, 
        getter: emails,
        defaultLabel: 'home',
        defaultValue: ''
      },
      address: { 
        setter: setAddresses, 
        getter: addresses,
        defaultLabel: 'home',
        defaultValue: ''
      },
      website: { 
        setter: setWebsites, 
        getter: websites,
        defaultLabel: 'homepage',
        defaultValue: 'https://'
      }
    };

    const config = fieldConfig[type];
    const newField: ContactField = {
      id: generateFieldId(),
      label: config.defaultLabel,
      value: config.defaultValue,
      type: type
    };
    
    config.setter([...config.getter, newField]);
  };

  const removeField = (type: 'phone' | 'email' | 'address' | 'website', fieldId: string) => {
    const setters = {
      phone: setPhoneNumbers,
      email: setEmails, 
      address: setAddresses,
      website: setWebsites
    };
    
    const getters = {
      phone: phoneNumbers,
      email: emails,
      address: addresses,
      website: websites
    };

    setters[type](getters[type].filter(field => field.id !== fieldId));
  };

  const updateField = (type: 'phone' | 'email' | 'address' | 'website', fieldId: string, updates: Partial<ContactField>) => {
    const setters = {
      phone: setPhoneNumbers,
      email: setEmails,
      address: setAddresses,
      website: setWebsites
    };
    
    const getters = {
      phone: phoneNumbers,
      email: emails,
      address: addresses,
      website: websites
    };

    setters[type](getters[type].map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const getLabelOptions = (type: string) => {
    const options = {
      phone: ['mobile', 'home', 'work', 'main', 'other'],
      email: ['home', 'work', 'school', 'other'],
      address: ['home', 'work', 'school', 'other'],
      website: ['homepage', 'work', 'blog', 'profile', 'other']
    };
    return options[type as keyof typeof options] || ['other'];
  };

  const getLabelIcon = (label: string) => {
    const icons = {
      mobile: Phone,
      home: Home,
      work: Briefcase,
      homepage: Globe,
      blog: Globe,
      profile: User
    };
    return icons[label as keyof typeof icons] || Phone;
  };

  // Fetch contact data
  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId,
  });

  // Fetch calls for this contact
  const { data: calls = [] } = useQuery<any[]>({
    queryKey: [`/api/calls`],
  });

  // Fetch SMS messages for this contact
  const { data: smsMessages = [] } = useQuery<any[]>({
    queryKey: [`/api/sms`],
  });

  // Filter calls and SMS for this contact based on phone numbers
  const contactCalls = contact ? calls.filter(call => {
    // Get phone numbers from the contact
    const phoneNumbers: string[] = [];
    if (contact.phoneNumbers) {
      try {
        const parsed = JSON.parse(contact.phoneNumbers);
        if (Array.isArray(parsed)) {
          phoneNumbers.push(...parsed);
        } else {
          phoneNumbers.push(contact.phoneNumbers);
        }
      } catch {
        phoneNumbers.push(contact.phoneNumbers);
      }
    }
    return phoneNumbers.some(phone => phone === call.from || phone === call.to);
  }) : [];

  const contactSMS = contact ? smsMessages.filter(sms => {
    // Get phone numbers from the contact
    const phoneNumbers: string[] = [];
    if (contact.phoneNumbers) {
      try {
        const parsed = JSON.parse(contact.phoneNumbers);
        if (Array.isArray(parsed)) {
          phoneNumbers.push(...parsed);
        } else {
          phoneNumbers.push(contact.phoneNumbers);
        }
      } catch {
        phoneNumbers.push(contact.phoneNumbers);
      }
    }
    return phoneNumbers.some(phone => phone === sms.from || phone === sms.to);
  }) : [];

  // Initialize form data from contact
  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName || '');
      setLastName(contact.lastName || '');
      setCompany(contact.company || '');
      setJobTitle(contact.jobTitle || '');
      setNotes(contact.notes || '');
      
      // Transform existing phone numbers
      setPhoneNumbers((contact.phoneNumbers || []).map((phone: string, index: number) => ({
        id: generateFieldId(),
        label: index === 0 ? 'mobile' : 'home',
        value: phone,
        type: 'phone'
      })));

      // Transform existing email
      setEmails(contact.email ? [{
        id: generateFieldId(),
        label: 'home',
        value: contact.email,
        type: 'email'
      }] : []);

      // Transform existing address
      setAddresses(contact.address ? [{
        id: generateFieldId(),
        label: 'home',
        value: contact.address,
        type: 'address'
      }] : []);

      // Initialize empty websites
      setWebsites([]);
    }
  }, [contact]);

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/contacts/${contactId}`, { method: 'PATCH', body: JSON.stringify(data) });
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

  const handleSave = () => {
    const saveData = {
      firstName: firstName || null,
      lastName: lastName || null,
      company: company || null,
      jobTitle: jobTitle || null,
      notes: notes || null,
      phoneNumbers: phoneNumbers.map(field => field.value),
      email: emails.length > 0 ? emails[0].value : null,
      address: addresses.length > 0 ? addresses[0].value : null
    };
    
    updateContactMutation.mutate(saveData);
  };

  if (isLoading) {
    return (
      <AppStoreLayout title="Contact Profile" subtitle="Loading contact information...">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-2xl"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  if (!contact) {
    return (
      <AppStoreLayout title="Contact Not Found" subtitle="The requested contact could not be found">
        <div className="p-6 max-w-4xl mx-auto">
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
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (contact.displayName) {
      const parts = contact.displayName.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
    }
    return phoneNumbers[0]?.value?.[0] || '?';
  };

  const getContactName = () => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (contact.displayName) return contact.displayName;
    if (firstName) return firstName;
    return phoneNumbers[0]?.value || 'Unknown Contact';
  };

  const renderContactField = (field: ContactField, type: 'phone' | 'email' | 'address' | 'website') => {
    const Icon = getLabelIcon(field.label);
    const isMultiline = type === 'address';
    
    return (
      <div key={field.id} className="group">
        <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mt-1">
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Select 
                  value={field.label} 
                  onValueChange={(value) => updateField(type, field.id, { label: value })}
                >
                  <SelectTrigger className="w-full text-xs bg-gray-50 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getLabelOptions(type).map(option => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isMultiline ? (
                  <Textarea
                    value={field.value}
                    onChange={(e) => updateField(type, field.id, { value: e.target.value })}
                    placeholder={`Enter ${type}...`}
                    className="resize-none"
                    rows={3}
                  />
                ) : (
                  <Input
                    value={field.value}
                    onChange={(e) => updateField(type, field.id, { value: e.target.value })}
                    placeholder={`Enter ${type}...`}
                    type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {field.label}
                </div>
                <div className="text-sm text-gray-900 break-all">
                  {field.value}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(field.value)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                
                {type === 'phone' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `tel:${field.value}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    
                    <SMSComposer
                      recipientPhone={field.value}
                      recipientName={getContactName()}
                      contactId={contact?.id}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      }
                    />
                  </>
                )}
                
                {type === 'email' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = `mailto:${field.value}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                )}
                
                {type === 'website' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(field.value, '_blank')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeField(type, field.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppStoreLayout title="" subtitle="">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-t-3xl">
          <div className="h-32 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-t-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Navigation */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/contacts')}
                className="rounded-full p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="rounded-full p-3 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30 text-white"
                disabled={updateContactMutation.isPending}
              >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Profile Section */}
          <div className="relative px-6 pb-6">
            <div className="flex items-end justify-between -mt-16 mb-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getContactInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
              </div>
            </div>

            {/* Name and Title */}
            <div className="space-y-2 mb-6">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="text-xl font-bold bg-white/50 border-0 placeholder:text-gray-400"
                    />
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="text-xl font-bold bg-white/50 border-0 placeholder:text-gray-400"
                    />
                  </div>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company"
                    className="bg-white/50 border-0 placeholder:text-gray-400"
                  />
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Job Title"
                    className="bg-white/50 border-0 placeholder:text-gray-400"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{getContactName()}</h1>
                  {(company || jobTitle) && (
                    <p className="text-gray-600">
                      {jobTitle}{jobTitle && company && ' at '}{company}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-b-3xl shadow-sm">
          {/* Phone Numbers */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-gray-900">Phone Numbers</h3>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addField('phone')}
                  className="text-blue-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {phoneNumbers.length === 0 && !isEditing ? (
              <div className="p-4 text-gray-500 text-sm">No phone numbers</div>
            ) : (
              <div>
                {phoneNumbers.map(field => renderContactField(field, 'phone'))}
                {phoneNumbers.length === 0 && isEditing && (
                  <div className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => addField('phone')}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Phone Number
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Addresses */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-gray-900">Email Addresses</h3>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addField('email')}
                  className="text-blue-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {emails.length === 0 && !isEditing ? (
              <div className="p-4 text-gray-500 text-sm">No email addresses</div>
            ) : (
              <div>
                {emails.map(field => renderContactField(field, 'email'))}
                {emails.length === 0 && isEditing && (
                  <div className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => addField('email')}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Email Address
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-gray-900">Addresses</h3>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addField('address')}
                  className="text-blue-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {addresses.length === 0 && !isEditing ? (
              <div className="p-4 text-gray-500 text-sm">No addresses</div>
            ) : (
              <div>
                {addresses.map(field => renderContactField(field, 'address'))}
                {addresses.length === 0 && isEditing && (
                  <div className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => addField('address')}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Websites */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-gray-900">Websites</h3>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addField('website')}
                  className="text-blue-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {websites.length === 0 && !isEditing ? (
              <div className="p-4 text-gray-500 text-sm">No websites</div>
            ) : (
              <div>
                {websites.map(field => renderContactField(field, 'website'))}
                {websites.length === 0 && isEditing && (
                  <div className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => addField('website')}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Website
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between p-4">
              <h3 className="font-semibold text-gray-900">Notes</h3>
            </div>
            <div className="p-4 pt-0">
              {isEditing ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  className="min-h-[80px] resize-none"
                />
              ) : (
                <div className="text-gray-600 text-sm">
                  {notes || 'No notes'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call History */}
        <div className="bg-white rounded-3xl shadow-sm mt-6">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-6 h-6" />
              Call History
              <Badge variant="secondary" className="ml-2">
                {contactCalls.length}
              </Badge>
            </h3>
          </div>
          
          {contactCalls.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No call history available</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contactCalls.slice(0, 5).map((call: any) => (
                <div key={call.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                     onClick={() => setLocation(`/conversation/${call.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        call.direction === 'inbound' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                        </div>
                        <div className="text-sm text-gray-500">
                          {call.startTime && new Date(call.startTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {call.duration ? Math.floor(call.duration / 60) : 0}m {call.duration ? call.duration % 60 : 0}s
                      </div>
                      {call.summary && (
                        <div className="text-xs text-gray-500 max-w-[200px] truncate">
                          {call.summary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {contactCalls.length > 5 && (
                <div className="p-4 text-center">
                  <Button variant="ghost" className="text-blue-600">
                    View All {contactCalls.length} Calls
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMS History */}
        <div className="bg-white rounded-3xl shadow-sm mt-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-gray-900">SMS History</h3>
                <Badge variant="secondary" className="ml-2">
                  {contactSMS.length}
                </Badge>
              </div>
              
              {phoneNumbers.length > 0 && (
                <SMSComposer
                  recipientPhone={phoneNumbers[0]?.value}
                  recipientName={getContactName()}
                  contactId={contact?.id}
                  trigger={
                    <Button className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Send SMS
                    </Button>
                  }
                />
              )}
            </div>
          </div>
          
          {contactSMS.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No SMS history available</p>
              {phoneNumbers.length > 0 ? (
                <SMSComposer
                  recipientPhone={phoneNumbers[0]?.value}
                  recipientName={getContactName()}
                  contactId={contact?.id}
                  trigger={
                    <Button className="mt-4 gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Send First Message
                    </Button>
                  }
                />
              ) : (
                <p className="text-sm mt-2">Add a phone number to send SMS messages</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contactSMS.slice(0, 5).map((sms: any) => (
                <div key={sms.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      sms.direction === 'inbound' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">
                          {sms.direction === 'inbound' ? 'Received' : 'Sent'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {sms.createdAt && new Date(sms.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-gray-700 text-sm">
                        {sms.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {contactSMS.length > 5 && (
                <div className="p-4 text-center">
                  <Button variant="ghost" className="text-blue-600">
                    View All {contactSMS.length} Messages
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppStoreLayout>
  );
}