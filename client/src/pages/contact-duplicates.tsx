import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Merge, 
  AlertTriangle, 
  Check, 
  X, 
  Eye,
  Brain,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Phone,
  Mail,
  Building,
  MapPin
} from "lucide-react";

interface DuplicateMatch {
  id: string;
  contact1: any;
  contact2: any;
  confidence: number;
  matchingFields: string[];
  suggestedMerge: any;
  reasons: string[];
}

interface Contact {
  id: number;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phoneNumbers?: string;
  company?: string;
  address?: string;
  notes?: string;
}

export default function ContactDuplicates() {
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateMatch | null>(null);
  const [mergePreview, setMergePreview] = useState<Contact | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: duplicates, isLoading, refetch } = useQuery<DuplicateMatch[]>({
    queryKey: ['/api/contacts/duplicates'],
    staleTime: 30000,
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ contact1Id, contact2Id, mergedData }: {
      contact1Id: number;
      contact2Id: number;
      mergedData: Partial<Contact>;
    }) => {
      return await apiRequest('/api/contacts/merge', {
        method: 'POST',
        body: JSON.stringify({ contact1Id, contact2Id, mergedData })
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contacts merged successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/duplicates'] });
      setSelectedDuplicate(null);
      setMergePreview(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to merge contacts",
        variant: "destructive",
      });
    },
  });

  const handleMerge = (duplicate: DuplicateMatch) => {
    const mergedData = {
      firstName: duplicate.suggestedMerge.firstName,
      lastName: duplicate.suggestedMerge.lastName,
      email: duplicate.suggestedMerge.email,
      company: duplicate.suggestedMerge.company,
      address: duplicate.suggestedMerge.address,
      notes: duplicate.suggestedMerge.notes,
    };

    mergeMutation.mutate({
      contact1Id: duplicate.contact1.id,
      contact2Id: duplicate.contact2.id,
      mergedData
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-red-500";
    if (confidence >= 0.8) return "bg-orange-500";
    if (confidence >= 0.7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.7) return "Medium";
    return "Low";
  };

  const formatPhoneNumbers = (phoneNumbers?: string) => {
    if (!phoneNumbers) return [];
    try {
      return JSON.parse(phoneNumbers);
    } catch {
      return [phoneNumbers];
    }
  };

  const getContactName = (contact: Contact) => {
    return contact.displayName || 
           [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 
           'Unknown Contact';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Duplicate Detection</h1>
              <p className="text-gray-600 dark:text-gray-400">Scanning contacts for potential duplicates...</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-3">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-lg text-gray-600 dark:text-gray-400">Analyzing contacts with AI...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Duplicate Detection</h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered analysis found {duplicates?.length || 0} potential duplicate contacts
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Re-scan
          </Button>
        </div>

        {/* Statistics */}
        {duplicates && duplicates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{duplicates.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duplicate Pairs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {duplicates.filter(d => d.confidence >= 0.9).length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">High Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {duplicates.filter(d => d.matchingFields.includes('name')).length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {duplicates.filter(d => d.matchingFields.includes('phone')).length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results */}
        {!duplicates || duplicates.length === 0 ? (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Great! No duplicate contacts were found. Your contact list is clean and organized.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {duplicates.map((duplicate) => (
              <Card key={duplicate.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getConfidenceColor(duplicate.confidence)} text-white`}
                      >
                        {Math.round(duplicate.confidence * 100)}% {getConfidenceText(duplicate.confidence)}
                      </Badge>
                      <CardTitle className="text-lg">Potential Duplicate Match</CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview Merge
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Merge Preview</DialogTitle>
                            <DialogDescription>
                              Review the AI-suggested merged contact information
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Contact 1: {getContactName(duplicate.contact1)}</h4>
                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                  {duplicate.contact1.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" />
                                      {duplicate.contact1.email}
                                    </div>
                                  )}
                                  {formatPhoneNumbers(duplicate.contact1.phoneNumbers).map((phone: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Phone className="h-3 w-3" />
                                      {phone}
                                    </div>
                                  ))}
                                  {duplicate.contact1.company && (
                                    <div className="flex items-center gap-2">
                                      <Building className="h-3 w-3" />
                                      {duplicate.contact1.company}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Contact 2: {getContactName(duplicate.contact2)}</h4>
                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                  {duplicate.contact2.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" />
                                      {duplicate.contact2.email}
                                    </div>
                                  )}
                                  {formatPhoneNumbers(duplicate.contact2.phoneNumbers).map((phone: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <Phone className="h-3 w-3" />
                                      {phone}
                                    </div>
                                  ))}
                                  {duplicate.contact2.company && (
                                    <div className="flex items-center gap-2">
                                      <Building className="h-3 w-3" />
                                      {duplicate.contact2.company}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <h4 className="font-medium mb-2 text-green-600">AI Suggested Merge Result</h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Name:</strong> {getContactName(duplicate.suggestedMerge)}</p>
                                {duplicate.suggestedMerge.email && (
                                  <p><strong>Email:</strong> {duplicate.suggestedMerge.email}</p>
                                )}
                                {duplicate.suggestedMerge.company && (
                                  <p><strong>Company:</strong> {duplicate.suggestedMerge.company}</p>
                                )}
                                {duplicate.suggestedMerge.address && (
                                  <p><strong>Address:</strong> {duplicate.suggestedMerge.address}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button 
                              onClick={() => handleMerge(duplicate)}
                              disabled={mergeMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Merge className="h-4 w-4 mr-1" />
                              {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        onClick={() => handleMerge(duplicate)}
                        disabled={mergeMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Merge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {duplicate.matchingFields.map((field) => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field} match
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact 1 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {getContactName(duplicate.contact1)}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        {duplicate.contact1.email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            {duplicate.contact1.email}
                          </div>
                        )}
                        
                        {formatPhoneNumbers(duplicate.contact1.phoneNumbers).map((phone: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            {phone}
                          </div>
                        ))}
                        
                        {duplicate.contact1.company && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Building className="h-4 w-4" />
                            {duplicate.contact1.company}
                          </div>
                        )}
                        
                        {duplicate.contact1.address && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {duplicate.contact1.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact 2 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {getContactName(duplicate.contact2)}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        {duplicate.contact2.email && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            {duplicate.contact2.email}
                          </div>
                        )}
                        
                        {formatPhoneNumbers(duplicate.contact2.phoneNumbers).map((phone: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            {phone}
                          </div>
                        ))}
                        
                        {duplicate.contact2.company && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Building className="h-4 w-4" />
                            {duplicate.contact2.company}
                          </div>
                        )}
                        
                        {duplicate.contact2.address && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {duplicate.contact2.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Analysis */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">AI Analysis</span>
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {duplicate.reasons.map((reason, idx) => (
                        <li key={idx}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}