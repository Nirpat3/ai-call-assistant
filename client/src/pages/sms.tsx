import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, Send, Phone, Calendar, Clock, Filter, ArrowUpDown } from "lucide-react";
import { SMSComposer, QuickSMSCard } from "@/components/SMSComposer";
import PageLayout from "@/components/PageLayout";
import { useToast } from "@/hooks/use-toast";

interface SMSMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: "inbound" | "outbound";
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  contact?: {
    id: number;
    displayName: string;
    firstName: string;
    lastName: string;
  };
}

export default function SMSPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDirection, setFilterDirection] = useState<"all" | "inbound" | "outbound">("all");
  const [sortBy, setSortBy] = useState<"date" | "contact">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  // Fetch SMS messages
  const { data: smsMessages = [], isLoading } = useQuery<SMSMessage[]>({
    queryKey: ["/api/sms"],
  });

  // Fetch contacts for quick selection
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
  });

  // Filter and sort messages
  const filteredMessages = smsMessages
    .filter(message => {
      const matchesSearch = 
        message.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.from.includes(searchTerm) ||
        message.to.includes(searchTerm) ||
        message.contact?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDirection = filterDirection === "all" || message.direction === filterDirection;
      
      return matchesSearch && matchesDirection;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.dateCreated).getTime();
        const dateB = new Date(b.dateCreated).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        const nameA = a.contact?.displayName || a.from;
        const nameB = b.contact?.displayName || b.from;
        return sortOrder === "desc" ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      }
    });

  const formatPhone = (phone: string) => {
    // Simple phone number formatting
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <PageLayout 
      title="Messages" 
      description="SMS communication center"
      icon={MessageSquare}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SMS Messages</h1>
            <p className="text-gray-600">Send and manage text messages</p>
          </div>
          
          <SMSComposer
            trigger={
              <Button className="gap-2">
                <Send className="w-4 h-4" />
                Send SMS
              </Button>
            }
          />
        </div>

        {/* Quick SMS Card */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QuickSMSCard />
          </div>
          
          <div className="lg:col-span-2">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Messages</p>
                      <p className="text-2xl font-bold">{smsMessages.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sent Today</p>
                      <p className="text-2xl font-bold">
                        {smsMessages.filter(msg => 
                          msg.direction === "outbound" && 
                          new Date(msg.dateCreated).toDateString() === new Date().toDateString()
                        ).length}
                      </p>
                    </div>
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Received Today</p>
                      <p className="text-2xl font-bold">
                        {smsMessages.filter(msg => 
                          msg.direction === "inbound" && 
                          new Date(msg.dateCreated).toDateString() === new Date().toDateString()
                        ).length}
                      </p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Message History
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                
                {/* Filter by direction */}
                <Select value={filterDirection} onValueChange={(value: any) => setFilterDirection(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="inbound">Received</SelectItem>
                    <SelectItem value="outbound">Sent</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Sort */}
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [by, order] = value.split('-');
                  setSortBy(by as "date" | "contact");
                  setSortOrder(order as "asc" | "desc");
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="contact-asc">Contact A-Z</SelectItem>
                    <SelectItem value="contact-desc">Contact Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages found</p>
                {searchTerm && (
                  <p className="text-sm mt-2">Try adjusting your search terms</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* Direction indicator */}
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      message.direction === "inbound" ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    
                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {message.contact?.displayName || 
                             (message.direction === "inbound" ? formatPhone(message.from) : formatPhone(message.to))}
                          </span>
                          <Badge variant={message.direction === "inbound" ? "secondary" : "default"}>
                            {message.direction === "inbound" ? "Received" : "Sent"}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(message.status)}>
                            {message.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {formatDate(message.dateCreated)}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 text-sm mb-2">{message.body}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        {message.direction === "inbound" ? `From: ${formatPhone(message.from)}` : `To: ${formatPhone(message.to)}`}
                      </div>
                    </div>
                    
                    {/* Quick actions */}
                    <div className="flex items-center gap-1">
                      <SMSComposer
                        recipientPhone={message.direction === "inbound" ? message.from : message.to}
                        recipientName={message.contact?.displayName}
                        contactId={message.contact?.id}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-blue-600">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}