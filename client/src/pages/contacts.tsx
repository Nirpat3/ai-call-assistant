import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Users, Search, Phone, Plus, Star, Mail, Building, MessageSquare, Brain, UserCheck, Upload, PhoneForwarded, Voicemail, Bot, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Contact {
  id: number;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  company: string | null;
  department: string | null;
  jobTitle: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  isVip: boolean;
  isSpam: boolean;
  phoneNumbers: string[];
  lastContactDate: Date | null;
  createdAt: Date | null;
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for adding a contact
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    company: "",
    jobTitle: "",
    notes: "",
    isVip: false,
    routingAction: "ai" as "ai" | "forward" | "voicemail" | "block",
    forwardTo: "",
  });

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createContactMutation = useMutation({
    mutationFn: async (contactData: typeof newContact) => {
      // Create contact
      const contact = await apiRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phoneNumbers: [contactData.phoneNumber],
          company: contactData.company,
          jobTitle: contactData.jobTitle,
          notes: contactData.notes,
          isVip: contactData.isVip,
          organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
        }),
      });

      // Create routing rule
      if (contactData.phoneNumber) {
        await apiRequest("/api/contact-routes", {
          method: "POST",
          body: JSON.stringify({
            contactId: contact.id,
            phoneNumber: contactData.phoneNumber,
            action: contactData.routingAction,
            forwardTo: contactData.routingAction === "forward" ? contactData.forwardTo : null,
            priority: contactData.isVip ? 10 : 1,
            active: true,
            organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
          }),
        });
      }

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowAddDialog(false);
      setNewContact({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        company: "",
        jobTitle: "",
        notes: "",
        isVip: false,
        routingAction: "ai",
        forwardTo: "",
      });
      toast({
        title: "Contact added",
        description: "Contact and routing rule created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact",
        variant: "destructive",
      });
    },
  });

  const importContactsMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split('\n');
      const contacts = [];

      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const [firstName, lastName, phone, email, company] = line.split(',').map(s => s.trim());
        if (phone) {
          contacts.push({
            firstName,
            lastName,
            phoneNumbers: [phone],
            email,
            company,
            organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
          });
        }
      }

      const result = await apiRequest("/api/contacts/sync/mobile", {
        method: "POST",
        body: JSON.stringify({
          contacts,
          source: "import",
        }),
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowImportDialog(false);
      toast({
        title: "Import successful",
        description: "Contacts imported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import contacts",
        variant: "destructive",
      });
    },
  });

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importContactsMutation.mutate(file);
    }
  };

  const getContactName = (contact: Contact) => {
    if (contact.displayName) return contact.displayName;
    if (contact.firstName && contact.lastName) return `${contact.firstName} ${contact.lastName}`;
    if (contact.firstName) return contact.firstName;
    return contact.phoneNumbers?.[0] || 'Unknown Contact';
  };

  const getContactInitials = (contact: Contact) => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
    }
    if (contact.displayName) {
      const parts = contact.displayName.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
    }
    return contact.phoneNumbers?.[0]?.[0] || '?';
  };

  const formatRelativeTime = (date: Date | string | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return target.toLocaleDateString();
  };

  const filteredContacts = contacts.filter(contact => {
    const name = getContactName(contact).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || 
           contact.phoneNumbers?.some(phone => phone.includes(searchQuery)) ||
           contact.email?.toLowerCase().includes(query) ||
           contact.company?.toLowerCase().includes(query);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContactMutation.mutate(newContact);
  };

  return (
      <div className="space-y-6">
        {/* Contact Count Card */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Count and Actions */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="inline-flex items-center px-3 py-2 bg-indigo-100 rounded-xl flex-shrink-0">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-xs sm:text-sm font-semibold text-indigo-700">{contacts.length} contacts</span>
                </div>
              </div>
              
              {/* Right side - Action buttons */}
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/contact-duplicates')}
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 rounded-xl px-4 sm:px-6"
                  data-testid="button-find-duplicates"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Find</span> Duplicates
                </Button>

                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-xl px-4 sm:px-6"
                      data-testid="button-import-contacts"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Import</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Contacts</DialogTitle>
                      <DialogDescription>
                        Upload a CSV file with columns: First Name, Last Name, Phone, Email, Company
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileImport}
                        data-testid="input-import-file"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 sm:px-6"
                      data-testid="button-add-contact"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Add</span> Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Contact</DialogTitle>
                      <DialogDescription>
                        Create a new contact and set up call routing rules
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={newContact.firstName}
                            onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                            required
                            data-testid="input-first-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={newContact.lastName}
                            onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={newContact.phoneNumber}
                          onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                          placeholder="+1234567890"
                          required
                          data-testid="input-phone-number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          data-testid="input-email"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={newContact.company}
                            onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                            data-testid="input-company"
                          />
                        </div>
                        <div>
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input
                            id="jobTitle"
                            value={newContact.jobTitle}
                            onChange={(e) => setNewContact({ ...newContact, jobTitle: e.target.value })}
                            data-testid="input-job-title"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newContact.notes}
                          onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isVip"
                          checked={newContact.isVip}
                          onCheckedChange={(checked) => setNewContact({ ...newContact, isVip: checked })}
                          data-testid="switch-is-vip"
                        />
                        <Label htmlFor="isVip" className="flex items-center">
                          <Star className="w-4 h-4 mr-2 text-yellow-500" />
                          Mark as VIP
                        </Label>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Call Routing</h4>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="routingAction">When this contact calls:</Label>
                            <Select
                              value={newContact.routingAction}
                              onValueChange={(value: any) => setNewContact({ ...newContact, routingAction: value })}
                            >
                              <SelectTrigger id="routingAction" data-testid="select-routing-action">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ai" data-testid="option-ai">
                                  <div className="flex items-center">
                                    <Bot className="w-4 h-4 mr-2" />
                                    Route to AI Assistant
                                  </div>
                                </SelectItem>
                                <SelectItem value="forward" data-testid="option-forward">
                                  <div className="flex items-center">
                                    <PhoneForwarded className="w-4 h-4 mr-2" />
                                    Forward to Number
                                  </div>
                                </SelectItem>
                                <SelectItem value="voicemail" data-testid="option-voicemail">
                                  <div className="flex items-center">
                                    <Voicemail className="w-4 h-4 mr-2" />
                                    Send to Voicemail
                                  </div>
                                </SelectItem>
                                <SelectItem value="block" data-testid="option-block">
                                  <div className="flex items-center">
                                    <Ban className="w-4 h-4 mr-2" />
                                    Block Calls
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {newContact.routingAction === "forward" && (
                            <div>
                              <Label htmlFor="forwardTo">Forward To Number *</Label>
                              <Input
                                id="forwardTo"
                                type="tel"
                                value={newContact.forwardTo}
                                onChange={(e) => setNewContact({ ...newContact, forwardTo: e.target.value })}
                                placeholder="+1234567890"
                                required
                                data-testid="input-forward-to"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createContactMutation.isPending}
                          data-testid="button-save-contact"
                        >
                          {createContactMutation.isPending ? "Saving..." : "Save Contact"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search contacts by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-gray-50 border-gray-200 rounded-2xl text-lg"
                data-testid="input-search-contacts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Cards - Social Media Style */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white border-gray-200 shadow-lg rounded-3xl">
              <CardContent className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                  <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          ) : filteredContacts.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-lg rounded-3xl">
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No contacts found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search or add a new contact.</p>
                <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-contact">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredContacts.map((contact) => (
              <Card 
                key={contact.id} 
                className="bg-white border border-gray-100 shadow-md rounded-3xl hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                onClick={() => setLocation(`/contact/${contact.id}`)}
                data-testid={`card-contact-${contact.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Profile Picture */}
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-2 border-gray-100">
                        <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getContactInitials(contact)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online Status Indicator */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {getContactName(contact)}
                          </h3>
                          {contact.isVip && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-full px-2 py-1">
                              <Star className="w-3 h-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                          {contact.isSpam && (
                            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 rounded-full px-2 py-1">
                              Spam
                            </Badge>
                          )}
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${contact.phoneNumbers?.[0]}`;
                            }}
                            data-testid={`button-call-${contact.id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          {contact.email && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `mailto:${contact.email}`;
                              }}
                              data-testid={`button-email-${contact.id}`}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Job Title & Company */}
                      <div className="space-y-1 mb-3">
                        {contact.jobTitle && (
                          <p className="text-gray-600 text-sm font-medium">{contact.jobTitle}</p>
                        )}
                        {contact.company && (
                          <p className="text-gray-500 text-sm flex items-center">
                            <Building className="w-3 h-3 mr-1" />
                            {contact.company}
                          </p>
                        )}
                      </div>

                      {/* Contact Details */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {contact.phoneNumbers?.[0] && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {contact.phoneNumbers[0]}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {contact.email}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {contact.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="rounded-full">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Last Contact */}
                      <div className="mt-3 text-xs text-gray-500">
                        Last contact: {formatRelativeTime(contact.lastContactDate)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
  );
}
