import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Contact, ContactRoute } from "@shared/schema";
import { Phone, Mail, Building, User, Plus, Edit, Trash2, Smartphone } from "lucide-react";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumbers: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  isVip: z.boolean().default(false),
});

export default function ContactManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingRoute, setEditingRoute] = useState<ContactRoute | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const addContactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumbers: "",
      company: "",
      title: "",
      notes: "",
      isVip: false,
    },
  });

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: contactRoutes = [] } = useQuery<ContactRoute[]>({
    queryKey: ["/api/contact-routes"],
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contactSchema>) => {
      const contactData = {
        ...data,
        phoneNumbers: [data.phoneNumbers], // Convert string to array
        email: data.email || null,
        company: data.company || null,
        title: data.title || null,
        notes: data.notes || null,
      };
      return await apiRequest("/api/contacts", { method: "POST", body: JSON.stringify(contactData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowAddContact(false);
      addContactForm.reset();
      toast({
        title: "Contact Added",
        description: "Contact has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: async (route: any) => {
      return await apiRequest("/api/contact-routes", { method: "POST", body: JSON.stringify(route) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-routes"] });
      setEditingRoute(null);
      toast({
        title: "Route Created",
        description: "Contact routing rule has been created successfully.",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/contacts/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setSelectedContact(null);
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed successfully.",
      });
    },
  });

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.firstName?.toLowerCase().includes(searchLower) ||
      contact.lastName?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower) ||
      (contact.phoneNumbers as any as string[])?.some((phone: string) => phone.includes(searchTerm))
    );
  });

  const getContactRoute = (contactId: number) => {
    return contactRoutes.find(route => route.contactId === contactId);
  };

  const handleCreateRoute = (action: string, forwardTo?: string) => {
    if (!selectedContact) return;

    createRouteMutation.mutate({
      contactId: selectedContact.id,
      action,
      forwardTo: forwardTo || null,
      priority: 1,
      active: true
    });
  };

  const getActionBadge = (action: string) => {
    const variants = {
      ai: "bg-blue-100 text-blue-800",
      forward: "bg-green-100 text-green-800",
      voicemail: "bg-yellow-100 text-yellow-800",
      block: "bg-red-100 text-red-800"
    };
    return variants[action as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const formatPhoneNumbers = (phoneNumbers: string[] | null) => {
    if (!phoneNumbers || phoneNumbers.length === 0) return "No phone numbers";
    return phoneNumbers.slice(0, 2).join(", ") + (phoneNumbers.length > 2 ? ` +${phoneNumbers.length - 2} more` : "");
  };

  const getInitials = (contact: Contact) => {
    const first = contact.firstName?.[0] || "";
    const last = contact.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <>
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Contact Management
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSyncDialog(true)}
                className="flex items-center space-x-2"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Sync Mobile</span>
              </Button>
              <Button 
                size="sm" 
                className="flex items-center space-x-2"
                onClick={() => setShowAddContact(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contact</span>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 pt-2">
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="text-sm text-gray-600">
              {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No contacts found" : "No contacts yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "Sync your mobile contacts or add them manually to get started"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowSyncDialog(true)}>
                  Sync Mobile Contacts
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredContacts.map((contact) => {
                const route = getContactRoute(contact.id);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.avatar || undefined} />
                        <AvatarFallback className="text-sm">
                          {getInitials(contact)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.isVip && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              VIP
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          {contact.phoneNumbers && (contact.phoneNumbers as any as string[]).length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span className="truncate">{formatPhoneNumbers(contact.phoneNumbers as any as string[])}</span>
                            </div>
                          )}
                          {contact.company && (
                            <div className="flex items-center space-x-1">
                              <Building className="w-3 h-3" />
                              <span className="truncate">{contact.company}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {route && (
                        <Badge className={getActionBadge(route.action)}>
                          {route.action.toUpperCase()}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {contact.syncSource || "Manual"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details Dialog */}
      {selectedContact && (
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedContact.avatar || undefined} />
                  <AvatarFallback>{getInitials(selectedContact)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </h3>
                  {selectedContact.company && (
                    <p className="text-sm text-gray-600">{selectedContact.company}</p>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                {(selectedContact.phoneNumbers as any as string[])?.map((phone: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{phone}</span>
                  </div>
                ))}
                
                {selectedContact.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedContact.email}</span>
                  </div>
                )}
              </div>
              
              {/* Routing Configuration */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Call Routing</h4>
                {getContactRoute(selectedContact.id) ? (
                  <div className="space-y-2">
                    <Badge className={getActionBadge(getContactRoute(selectedContact.id)!.action)}>
                      {getContactRoute(selectedContact.id)!.action.toUpperCase()}
                    </Badge>
                    {getContactRoute(selectedContact.id)!.forwardTo && (
                      <p className="text-sm text-gray-600">
                        Forward to: {getContactRoute(selectedContact.id)!.forwardTo}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Choose how to handle calls from this contact:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateRoute("ai")}
                        disabled={createRouteMutation.isPending}
                      >
                        AI Assistant
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateRoute("voicemail")}
                        disabled={createRouteMutation.isPending}
                      >
                        Voicemail
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="border-t pt-4 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteContactMutation.mutate(selectedContact.id)}
                  disabled={deleteContactMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <Form {...addContactForm}>
            <form onSubmit={addContactForm.handleSubmit((data) => createContactMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addContactForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addContactForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addContactForm.control}
                name="phoneNumbers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addContactForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addContactForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addContactForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addContactForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional information..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addContactForm.control}
                name="isVip"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>VIP Contact</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as VIP for priority handling
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createContactMutation.isPending}>
                  {createContactMutation.isPending ? 'Adding...' : 'Add Contact'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mobile Sync Dialog */}
      {showSyncDialog && (
        <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sync Mobile Contacts</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                To sync contacts from your mobile device, use our mobile app or send contact data via API.
              </p>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">iOS App Store</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Download our iOS app to automatically sync your contacts and manage call routing on the go.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Google Play Store</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Get our Android app for seamless contact synchronization and mobile call management.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">API Integration</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Integrate directly with our API to sync contacts programmatically.
                  </p>
                  <Button variant="outline" size="sm">
                    View API Docs
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}