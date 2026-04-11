import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Download, Upload, RefreshCw, CheckCircle, XCircle, AlertCircle, Users, Shield, Calendar, User, Phone, Mail, Building, MapPin, ArrowLeft, ArrowRight, FileUp, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";


interface MobileContact {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: Array<{
    number: string;
    type: 'mobile' | 'work' | 'home' | 'other';
    isPrimary?: boolean;
  }>;
  emails: Array<{
    email: string;
    type: 'personal' | 'work' | 'other';
    isPrimary?: boolean;
  }>;
  addresses: Array<{
    address: string;
    type: 'home' | 'work' | 'other';
  }>;
  company?: string;
  jobTitle?: string;
  notes?: string;
  avatar?: string;
  groups?: string[];
  isFavorite?: boolean;
  source: 'ios' | 'android';
}

interface SyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
  duplicates: number;
}

interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  totalSteps: number;
}

export default function MobileSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    progress: 0,
    currentStep: 'Ready to sync',
    totalSteps: 0
  });
  
  const [selectedDevice, setSelectedDevice] = useState<'ios' | 'android'>('ios');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [previewContacts, setPreviewContacts] = useState<MobileContact[]>([]);
  const [syncMode, setSyncMode] = useState<'import' | 'export' | 'bidirectional'>('import');
  const [importMethod, setImportMethod] = useState<'device' | 'file'>('file');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseVCF = (content: string): MobileContact[] => {
    const contacts: MobileContact[] = [];
    const vcards = content.split('BEGIN:VCARD').filter(v => v.trim());
    
    vcards.forEach((vcard, index) => {
      try {
        const lines = vcard.split('\n').map(l => l.trim());
        const contact: MobileContact = {
          id: `vcf-${Date.now()}-${index}`,
          displayName: '',
          phoneNumbers: [],
          emails: [],
          addresses: [],
          source: 'ios'
        };
        
        lines.forEach(line => {
          if (line.startsWith('FN:')) {
            contact.displayName = line.substring(3);
          } else if (line.startsWith('N:')) {
            const parts = line.substring(2).split(';');
            contact.lastName = parts[0] || undefined;
            contact.firstName = parts[1] || undefined;
            if (!contact.displayName && (contact.firstName || contact.lastName)) {
              contact.displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
            }
          } else if (line.startsWith('TEL') || line.includes('TEL:')) {
            const number = line.split(':').pop() || '';
            if (number) {
              let type: 'mobile' | 'work' | 'home' | 'other' = 'mobile';
              if (line.toLowerCase().includes('work')) type = 'work';
              else if (line.toLowerCase().includes('home')) type = 'home';
              contact.phoneNumbers.push({ number: number.replace(/\s/g, ''), type });
            }
          } else if (line.startsWith('EMAIL') || line.includes('EMAIL:')) {
            const email = line.split(':').pop() || '';
            if (email) {
              let type: 'personal' | 'work' | 'other' = 'personal';
              if (line.toLowerCase().includes('work')) type = 'work';
              contact.emails.push({ email, type });
            }
          } else if (line.startsWith('ORG:')) {
            contact.company = line.substring(4).split(';')[0];
          } else if (line.startsWith('TITLE:')) {
            contact.jobTitle = line.substring(6);
          } else if (line.startsWith('ADR') || line.includes('ADR:')) {
            const addr = line.split(':').pop() || '';
            if (addr) {
              const parts = addr.split(';').filter(p => p);
              const address = parts.join(', ');
              if (address) {
                let type: 'home' | 'work' | 'other' = 'home';
                if (line.toLowerCase().includes('work')) type = 'work';
                contact.addresses.push({ address, type });
              }
            }
          } else if (line.startsWith('NOTE:')) {
            contact.notes = line.substring(5);
          }
        });
        
        if (contact.displayName || contact.phoneNumbers.length > 0) {
          contacts.push(contact);
        }
      } catch (e) {
        console.error('Error parsing vCard:', e);
      }
    });
    
    return contacts;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isVCF = file.name.toLowerCase().endsWith('.vcf') || file.type === 'text/vcard';
    const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    
    if (!isVCF && !isCSV) {
      toast({
        title: "Unsupported File",
        description: "Please upload a .vcf (vCard) or .csv file.",
        variant: "destructive"
      });
      return;
    }
    
    setSyncStatus({ isRunning: true, progress: 20, currentStep: 'Reading file...', totalSteps: 3 });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setSyncStatus(prev => ({ ...prev, progress: 50, currentStep: 'Parsing contacts...' }));
        
        let parsedContacts: MobileContact[] = [];
        
        if (isVCF) {
          parsedContacts = parseVCF(content);
        } else if (isCSV) {
          const lines = content.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          parsedContacts = lines.slice(1).map((line, idx) => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const getValue = (keys: string[]) => {
              for (const key of keys) {
                const index = headers.findIndex(h => h.includes(key));
                if (index !== -1 && values[index]) return values[index];
              }
              return '';
            };
            
            const firstName = getValue(['first', 'given']);
            const lastName = getValue(['last', 'family', 'surname']);
            const phone = getValue(['phone', 'mobile', 'tel', 'cell']);
            const email = getValue(['email', 'mail']);
            const company = getValue(['company', 'org', 'organization']);
            
            return {
              id: `csv-${Date.now()}-${idx}`,
              displayName: getValue(['name', 'display', 'full']) || `${firstName} ${lastName}`.trim(),
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              phoneNumbers: phone ? [{ number: phone, type: 'mobile' as const }] : [],
              emails: email ? [{ email, type: 'personal' as const }] : [],
              addresses: [],
              company: company || undefined,
              source: 'ios' as const
            };
          }).filter(c => c.displayName || c.phoneNumbers.length > 0);
        }
        
        setSyncStatus({ isRunning: false, progress: 100, currentStep: `Found ${parsedContacts.length} contacts`, totalSteps: 3 });
        setPreviewContacts(parsedContacts);
        setSelectedContacts(parsedContacts.map(c => c.id));
        
        toast({
          title: "Contacts Loaded",
          description: `Successfully parsed ${parsedContacts.length} contacts from ${file.name}`,
        });
      } catch (error) {
        setSyncStatus({ isRunning: false, progress: 0, currentStep: 'Error parsing file', totalSteps: 0 });
        toast({
          title: "Parse Error",
          description: "Failed to parse the contact file. Please check the format.",
          variant: "destructive"
        });
      }
    };
    reader.onerror = () => {
      setSyncStatus({ isRunning: false, progress: 0, currentStep: 'Error reading file', totalSteps: 0 });
      toast({
        title: "Read Error",
        description: "Failed to read the file.",
        variant: "destructive"
      });
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch sync history
  const { data: syncHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/mobile-sync/history'],
  });

  // Fetch device contacts (simulated for demo)
  const { data: deviceContacts = [] } = useQuery<MobileContact[]>({
    queryKey: ['/api/mobile-sync/device-contacts', selectedDevice],
    enabled: false, // Only fetch when user requests
  });

  // Fetch platform contacts for export
  const { data: platformContacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
  });

  // Mobile sync mutation
  const syncMutation = useMutation({
    mutationFn: async (syncData: {
      deviceType: string;
      contacts: MobileContact[];
      syncMode: string;
    }) => {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        currentStep: 'Preparing sync...'
      }));

      // Simulate sync progress
      const steps = [
        'Validating contacts...',
        'Checking for duplicates...',
        'Processing contact data...',
        'Syncing to platform...',
        'Updating contact records...',
        'Finalizing sync...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setSyncStatus(prev => ({
          ...prev,
          progress: ((i + 1) / steps.length) * 100,
          currentStep: steps[i],
          totalSteps: steps.length
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await apiRequest('/api/mobile-sync/sync', {
        method: 'POST',
        body: JSON.stringify(syncData)
      });
      
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        progress: 100,
        currentStep: 'Sync completed'
      }));

      return result;
    },
    onSuccess: (result: SyncResult) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile-sync/history'] });
      
      toast({
        title: "Sync Completed",
        description: `Successfully synced ${result.synced} contacts with ${result.duplicates} duplicates handled.`,
      });
    },
    onError: (error) => {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'Sync failed'
      }));
      
      toast({
        title: "Sync Failed",
        description: "Failed to sync contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Simulate device contact detection
  const detectDeviceContacts = async () => {
    setSyncStatus(prev => ({
      ...prev,
      isRunning: true,
      progress: 0,
      currentStep: 'Detecting device contacts...'
    }));

    // Simulate device detection
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockContacts: MobileContact[] = [
      {
        id: '1',
        displayName: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        phoneNumbers: [
          { number: '+1234567890', type: 'mobile', isPrimary: true },
          { number: '+1234567891', type: 'work' }
        ],
        emails: [
          { email: 'john@example.com', type: 'personal', isPrimary: true },
          { email: 'j.smith@company.com', type: 'work' }
        ],
        addresses: [
          { address: '123 Main St, San Francisco, CA 94102', type: 'home' }
        ],
        company: 'Tech Corp',
        jobTitle: 'Software Engineer',
        source: selectedDevice,
        isFavorite: true,
        groups: ['Work', 'VIP']
      },
      {
        id: '2',
        displayName: 'Sarah Johnson',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phoneNumbers: [
          { number: '+1234567892', type: 'mobile', isPrimary: true }
        ],
        emails: [
          { email: 'sarah@example.com', type: 'personal', isPrimary: true }
        ],
        addresses: [
          { address: '456 Design Ave, Los Angeles, CA 90210', type: 'home' }
        ],
        company: 'Design Studio',
        jobTitle: 'UX Designer',
        source: selectedDevice,
        isFavorite: false,
        groups: ['Friends']
      },
      {
        id: '3',
        displayName: 'Michael Chen',
        firstName: 'Michael',
        lastName: 'Chen',
        phoneNumbers: [
          { number: '+1234567893', type: 'mobile', isPrimary: true }
        ],
        emails: [
          { email: 'michael@example.com', type: 'personal', isPrimary: true }
        ],
        addresses: [
          { address: '789 Business Blvd, New York, NY 10001', type: 'work' }
        ],
        company: 'Marketing Inc',
        jobTitle: 'Marketing Manager',
        source: selectedDevice,
        isFavorite: true,
        groups: ['Business']
      }
    ];

    setPreviewContacts(mockContacts);
    setSelectedContacts(mockContacts.map(c => c.id));
    
    setSyncStatus(prev => ({
      ...prev,
      isRunning: false,
      progress: 100,
      currentStep: `Found ${mockContacts.length} contacts`
    }));
  };

  const handleSync = () => {
    const contactsToSync = previewContacts.filter(c => selectedContacts.includes(c.id));
    
    if (contactsToSync.length === 0) {
      toast({
        title: "No Contacts Selected",
        description: "Please select at least one contact to sync.",
        variant: "destructive",
      });
      return;
    }

    syncMutation.mutate({
      deviceType: selectedDevice,
      contacts: contactsToSync,
      syncMode
    });
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(previewContacts.map(c => c.id));
  };

  const deselectAllContacts = () => {
    setSelectedContacts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Mobile Sync</h1>
              <p className="text-sm text-gray-600">Sync contacts between your mobile device and the platform</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Sync Status */}
        {syncStatus.isRunning && (
          <Card className="border-blue-200 bg-blue-50 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <h3 className="font-semibold text-blue-900">Syncing Contacts</h3>
                  <p className="text-sm text-blue-700">{syncStatus.currentStep}</p>
                </div>
              </div>
              <Progress value={syncStatus.progress} className="h-2" />
              <p className="text-sm text-blue-600 mt-2">{Math.round(syncStatus.progress)}% complete</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-gray-100 p-1">
            <TabsTrigger value="import" className="rounded-xl">Import from Device</TabsTrigger>
            <TabsTrigger value="export" className="rounded-xl">Export to Device</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">Sync History</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Import Method Selection */}
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Import Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button
                    variant={importMethod === 'file' ? 'default' : 'outline'}
                    onClick={() => setImportMethod('file')}
                    className="flex-1 rounded-xl"
                  >
                    <FileUp className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    variant={importMethod === 'device' ? 'default' : 'outline'}
                    onClick={() => setImportMethod('device')}
                    className="flex-1 rounded-xl"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    From Device
                  </Button>
                </div>

                {importMethod === 'file' && (
                  <div className="space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>How to export contacts:</strong><br />
                        <span className="text-sm">
                          <strong>iPhone:</strong> Settings → Contacts → Export vCard, or use iCloud.com<br />
                          <strong>Android:</strong> Contacts app → Menu → Export → Save as .vcf
                        </span>
                      </AlertDescription>
                    </Alert>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vcf,.csv,text/vcard,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="file-input-contacts"
                    />
                    
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="drop-zone-contacts"
                    >
                      <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Click to upload contact file</p>
                      <p className="text-sm text-gray-500 mt-1">Supports .vcf (vCard) and .csv files</p>
                    </div>
                  </div>
                )}

                {importMethod === 'device' && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Button
                        variant={selectedDevice === 'ios' ? 'default' : 'outline'}
                        onClick={() => setSelectedDevice('ios')}
                        className="flex-1 rounded-xl"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 6.02.85 7.21a8.93 8.93 0 01-2.9 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        iOS
                      </Button>
                      <Button
                        variant={selectedDevice === 'android' ? 'default' : 'outline'}
                        onClick={() => setSelectedDevice('android')}
                        className="flex-1 rounded-xl"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.523 15.341c-.36 0-.653-.292-.653-.653s.292-.653.653-.653.653.292.653.653-.292.653-.653.653zm-11.046 0c-.36 0-.653-.292-.653-.653s.292-.653.653-.653.653.292.653.653-.292.653-.653.653zm11.405-6.936L19.402 6.9c.18-.295.084-.677-.212-.857-.296-.18-.677-.084-.857.212l-1.676 2.607C15.726 8.434 14.4 8.149 13 8.149s-2.726.285-3.657.713L7.667 6.255c-.18-.296-.561-.392-.857-.212-.296.18-.392.561-.212.857l1.52 2.505c-1.493.982-2.473 2.65-2.473 4.595v.1h12.71v-.1c0-1.945-.98-3.613-2.473-4.595z"/>
                        </svg>
                        Android
                      </Button>
                    </div>
                    
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Direct device sync requires a mobile app. For web browsers, please use the file upload option above.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={detectDeviceContacts}
                      disabled={syncStatus.isRunning}
                      className="w-full rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Detect Device Contacts (Demo)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Preview */}
            {previewContacts.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Device Contacts ({previewContacts.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllContacts}
                        className="rounded-xl"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllContacts}
                        className="rounded-xl"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {previewContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedContacts.includes(contact.id)
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleContactSelection(contact.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              selectedContacts.includes(contact.id)
                                ? 'bg-blue-600'
                                : 'bg-gray-300'
                            }`} />
                            <div>
                              <h4 className="font-medium text-gray-900">{contact.displayName}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {contact.phoneNumbers[0] && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.phoneNumbers[0].number}
                                  </div>
                                )}
                                {contact.emails[0] && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {contact.emails[0].email}
                                  </div>
                                )}
                                {contact.company && (
                                  <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    {contact.company}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.isFavorite && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                Favorite
                              </Badge>
                            )}
                            {contact.groups && contact.groups.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {contact.groups.length} groups
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {selectedContacts.length} of {previewContacts.length} contacts selected
                    </div>
                    <Button
                      onClick={handleSync}
                      disabled={syncStatus.isRunning || selectedContacts.length === 0}
                      className="rounded-xl"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Sync Selected Contacts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Export Contacts to Device
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export functionality requires the mobile app to be installed on your device. 
                    You can download the app from the App Store or Google Play.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div>
                      <h4 className="font-medium">Platform Contacts</h4>
                      <p className="text-sm text-gray-600">{platformContacts.length} contacts available</p>
                    </div>
                    <Button variant="outline" className="rounded-xl">
                      <Download className="w-4 h-4 mr-2" />
                      Download vCard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-b from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Sync History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sync History</h3>
                    <p className="text-gray-600">Your contact sync history will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syncHistory.map((sync, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            sync.success ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <h4 className="font-medium">{sync.deviceType} Sync</h4>
                            <p className="text-sm text-gray-600">{sync.timestamp}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={sync.success ? 'default' : 'destructive'}>
                            {sync.success ? 'Success' : 'Failed'}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {sync.synced} synced, {sync.duplicates} duplicates
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}