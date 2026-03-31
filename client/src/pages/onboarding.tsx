import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Circle, Clock, Phone, MessageSquare, Settings, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  timeEstimate: string;
  required: boolean;
}

interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  twilioCredentials?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  aiConfig?: {
    businessName: string;
    businessDescription: string;
    services: string[];
  };
  setupComplete: boolean;
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Form states
  const [twilioForm, setTwilioForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });
  
  const [aiForm, setAiForm] = useState({
    businessName: '',
    businessDescription: '',
    services: '',
    tone: 'professional'
  });

  const { data: progress = { currentStep: 0, completedSteps: [], setupComplete: false } } = useQuery<OnboardingProgress>({
    queryKey: ['/api/onboarding/progress'],
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data: { step: string; data?: any }) =>
      apiRequest('/api/onboarding/progress', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
      toast({ title: 'Progress saved' });
    },
  });

  const testTwilioMutation = useMutation({
    mutationFn: (credentials: any) =>
      apiRequest('/api/twilio/test-connection', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: () => {
      toast({ title: 'Twilio connection successful!', description: 'Your credentials are working correctly.' });
      handleCompleteStep('twilio-integration');
    },
    onError: () => {
      toast({ title: 'Connection failed', description: 'Please check your credentials and try again.', variant: 'destructive' });
    },
  });

  const configureAiMutation = useMutation({
    mutationFn: (config: any) =>
      apiRequest('/api/ai-config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      toast({ title: 'AI configuration saved!', description: 'Your assistant is now configured.' });
      handleCompleteStep('ai-configuration');
    },
  });

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to AI Call Assistant',
      description: 'Get ready to set up your intelligent phone system',
      completed: progress.completedSteps.includes('welcome'),
      timeEstimate: '2 min',
      required: true
    },
    {
      id: 'requirements',
      title: 'Gather Requirements',
      description: 'Collect the information and documents you\'ll need',
      completed: progress.completedSteps.includes('requirements'),
      timeEstimate: '5 min',
      required: true
    },
    {
      id: 'twilio-account',
      title: 'Create Twilio Account',
      description: 'Set up your Twilio account and purchase a phone number',
      completed: progress.completedSteps.includes('twilio-account'),
      timeEstimate: '10 min',
      required: true
    },
    {
      id: 'twilio-integration',
      title: 'Connect to Platform',
      description: 'Link your Twilio account to the AI Call Assistant',
      completed: progress.completedSteps.includes('twilio-integration'),
      timeEstimate: '5 min',
      required: true
    },
    {
      id: 'call-forwarding',
      title: 'Call Forwarding Setup',
      description: 'Connect your business number to the AI system',
      completed: progress.completedSteps.includes('call-forwarding'),
      timeEstimate: '10 min',
      required: true
    },
    {
      id: 'ai-configuration',
      title: 'Configure AI Assistant',
      description: 'Teach the AI about your business',
      completed: progress.completedSteps.includes('ai-configuration'),
      timeEstimate: '8 min',
      required: true
    },
    {
      id: 'call-routing',
      title: 'Setup Call Routing',
      description: 'Configure department routing and phone tree options',
      completed: progress.completedSteps.includes('call-routing'),
      timeEstimate: '6 min',
      required: true
    },
    {
      id: 'testing',
      title: 'Test Your Setup',
      description: 'Make a test call to verify everything works',
      completed: progress.completedSteps.includes('testing'),
      timeEstimate: '5 min',
      required: true
    },
    {
      id: 'sms-setup',
      title: 'SMS Configuration (Optional)',
      description: 'Set up SMS messaging with A2P 10DLC registration',
      completed: progress.completedSteps.includes('sms-setup'),
      timeEstimate: '3-4 weeks',
      required: false
    }
  ];

  const totalSteps = onboardingSteps.filter(step => step.required).length;
  const completedRequiredSteps = onboardingSteps.filter(step => step.required && step.completed).length;
  const progressPercentage = (completedRequiredSteps / totalSteps) * 100;

  const handleCompleteStep = (stepId: string) => {
    updateProgressMutation.mutate({ step: stepId });
    const stepIndex = onboardingSteps.findIndex(step => step.id === stepId);
    if (stepIndex < onboardingSteps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleTwilioSubmit = () => {
    if (!twilioForm.accountSid || !twilioForm.authToken || !twilioForm.phoneNumber) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    testTwilioMutation.mutate(twilioForm);
  };

  const handleAiSubmit = () => {
    if (!aiForm.businessName || !aiForm.businessDescription) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    
    const config = {
      businessName: aiForm.businessName,
      businessDescription: aiForm.businessDescription,
      services: aiForm.services.split(',').map(s => s.trim()).filter(Boolean),
      tone: aiForm.tone
    };
    
    configureAiMutation.mutate(config);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Setup Your AI Call Assistant</h1>
        <p className="text-muted-foreground mb-4">
          Follow these steps to get your intelligent phone system up and running
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <Progress value={progressPercentage} className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {completedRequiredSteps} of {totalSteps} steps completed
          </span>
        </div>

        {progress.setupComplete && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Setup complete! Your AI Call Assistant is ready to take calls. 
              <Link href="/dashboard" className="ml-2 text-primary hover:underline">
                Go to Dashboard
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setup Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    index === currentStep ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : index === currentStep ? (
                    <Circle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.title}</span>
                      {!step.required && (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{step.timeEstimate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{currentStepData.title}</CardTitle>
                {currentStepData.completed && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step Content */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Phone className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to AI Call Assistant!</h3>
                    <p className="text-muted-foreground mb-6">
                      You're about to set up an intelligent phone system that will transform how you handle calls.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <Phone className="h-8 w-8 mb-2 text-blue-500" />
                      <h4 className="font-medium mb-1">Voice Calls</h4>
                      <p className="text-sm text-muted-foreground">Ready in 30 minutes</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <MessageSquare className="h-8 w-8 mb-2 text-green-500" />
                      <h4 className="font-medium mb-1">SMS Messages</h4>
                      <p className="text-sm text-muted-foreground">Ready in 3-4 weeks</p>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Total setup cost: ~$59 initial + $5-10/month ongoing
                    </AlertDescription>
                  </Alert>

                  <Button onClick={() => handleCompleteStep('welcome')} className="w-full">
                    Get Started
                  </Button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Required Information</h3>
                    <div className="space-y-2">
                      {[
                        'Business name (exactly as registered)',
                        'Business address (physical location)',
                        'Tax ID number (EIN or SSN)',
                        'Business email address',
                        'Credit card for registration fees'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Required Documents</h3>
                    <div className="space-y-2">
                      {[
                        'Business license or articles of incorporation',
                        'Government-issued photo ID',
                        'Proof of business address'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => handleCompleteStep('requirements')} className="w-full">
                    I Have Everything Ready
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-semibold mb-2">Step 1: Create Twilio Account</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sign up for a free Twilio account and upgrade to remove trial limitations.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Twilio Sign Up
                        </a>
                      </Button>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-semibold mb-2">Step 2: Purchase Phone Number</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        In Twilio Console: Phone Numbers → Manage → Buy a number
                      </p>
                      <ul className="text-sm space-y-1">
                        <li>• Choose "Local" number type</li>
                        <li>• Enter your area code</li>
                        <li>• Select and purchase ($1/month)</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h3 className="font-semibold mb-2">Step 3: Get Your Credentials</h3>
                      <p className="text-sm text-muted-foreground">
                        In Twilio Console → Settings → General, copy your Account SID and Auth Token
                      </p>
                    </div>
                  </div>

                  <Button onClick={() => handleCompleteStep('twilio-account')} className="w-full">
                    I've Created My Twilio Account
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Connect Your Twilio Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your Twilio credentials to connect your account to the platform.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="accountSid">Account SID</Label>
                      <Input
                        id="accountSid"
                        placeholder="AC..."
                        value={twilioForm.accountSid}
                        onChange={(e) => setTwilioForm({ ...twilioForm, accountSid: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Starts with "AC" - found in Twilio Console → Settings → General
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="authToken">Auth Token</Label>
                      <Input
                        id="authToken"
                        type="password"
                        placeholder="Your auth token"
                        value={twilioForm.authToken}
                        onChange={(e) => setTwilioForm({ ...twilioForm, authToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Click "show" in Twilio Console to reveal
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+12345678900"
                        value={twilioForm.phoneNumber}
                        onChange={(e) => setTwilioForm({ ...twilioForm, phoneNumber: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Include country code (e.g., +12345678900)
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleTwilioSubmit} 
                    className="w-full"
                    disabled={testTwilioMutation.isPending}
                  >
                    {testTwilioMutation.isPending ? 'Testing Connection...' : 'Test Connection'}
                  </Button>

                  {/* Call Forwarding Setup Alert */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      After testing succeeds, you'll configure call forwarding in the next step to route your business calls to the AI system.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Call Forwarding Setup</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your existing business phone number to route calls through the AI system.
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> You have two options to route calls to your AI assistant.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    {/* Option 1: Use Twilio Number Directly */}
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <h4 className="font-semibold mb-3 text-blue-900">Option 1: Use Your Twilio Number (Recommended)</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                          <span>Give customers your Twilio number directly:</span>
                        </div>
                        <div className="ml-8 p-3 bg-white border rounded font-mono text-center">
                          {progress.twilioCredentials?.phoneNumber || 'Your Twilio Number'}
                          {progress.twilioCredentials?.phoneNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-2"
                              onClick={() => copyToClipboard(progress.twilioCredentials!.phoneNumber, 'twilio-phone')}
                            >
                              {copiedField === 'twilio-phone' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                          <span>Update your website, business cards, and directories</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                          <span>AI assistant answers all calls automatically</span>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Forward from Existing Number */}
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <h4 className="font-semibold mb-3 text-green-900">Option 2: Forward From Existing Business Number</h4>
                      <div className="space-y-3 text-sm">
                        <p>Keep your current business number and forward calls to the AI system:</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                            <span><strong>Contact your phone provider</strong> (Verizon, AT&T, etc.)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                            <span><strong>Request call forwarding</strong> to your Twilio number</span>
                          </div>
                          <div className="ml-8 p-3 bg-white border rounded">
                            <div className="font-medium">Forward to:</div>
                            <div className="font-mono text-lg">
                              {progress.twilioCredentials?.phoneNumber || 'Your Twilio Number'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                            <span><strong>Test the forwarding</strong> by calling your business number</span>
                          </div>
                        </div>

                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Provider Instructions:</strong> Say "I need to set up call forwarding to forward all calls from [your business number] to [your Twilio number]"
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>

                    {/* Provider-Specific Instructions */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Provider-Specific Instructions</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>Verizon:</strong> Dial *72 + Twilio number, or call 611
                        </div>
                        <div>
                          <strong>AT&T:</strong> Dial *21* + Twilio number + #, or call 611
                        </div>
                        <div>
                          <strong>T-Mobile:</strong> Dial **21* + Twilio number + #, or call 611
                        </div>
                        <div>
                          <strong>Office/VoIP:</strong> Contact your provider or IT department
                        </div>
                      </div>
                    </div>

                    {/* Webhook Configuration */}
                    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                      <h4 className="font-semibold mb-3 text-purple-900">Automatic Webhook Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Webhook URL configured automatically</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Voice handling endpoints set up</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>AI assistant ready to receive calls</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => handleCompleteStep('call-forwarding')} className="w-full">
                    Call Forwarding Configured
                  </Button>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Configure Your AI Assistant</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Teach the AI about your business so it can provide accurate responses to callers.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="Your Company Name"
                        value={aiForm.businessName}
                        onChange={(e) => setAiForm({ ...aiForm, businessName: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="businessDescription">Business Description *</Label>
                      <Textarea
                        id="businessDescription"
                        placeholder="Describe what your business does..."
                        value={aiForm.businessDescription}
                        onChange={(e) => setAiForm({ ...aiForm, businessDescription: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="services">Main Services</Label>
                      <Input
                        id="services"
                        placeholder="Service 1, Service 2, Service 3"
                        value={aiForm.services}
                        onChange={(e) => setAiForm({ ...aiForm, services: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Separate multiple services with commas
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="tone">Assistant Tone</Label>
                      <select
                        id="tone"
                        className="w-full p-2 border rounded-md"
                        value={aiForm.tone}
                        onChange={(e) => setAiForm({ ...aiForm, tone: e.target.value })}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleAiSubmit} 
                    className="w-full"
                    disabled={configureAiMutation.isPending}
                  >
                    {configureAiMutation.isPending ? 'Saving Configuration...' : 'Save AI Configuration'}
                  </Button>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Setup Call Routing</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure how calls are routed to different departments using interactive phone tree options.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium mb-2">Phone Tree Options</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Set up "Press 1 for Sales, Press 2 for Support" style routing
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                          <span>Sales Department</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                          <span>Support Department</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                          <span>General Information</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium mb-2">Business Hours Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        During business hours: Route to departments or AI assistant
                        After hours: Direct to voicemail or AI assistant
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-medium mb-2">Quick Setup Available</h4>
                      <p className="text-sm text-muted-foreground">
                        You can configure detailed call routing options later in the Call Routing section.
                      </p>
                    </div>
                  </div>

                  <Button onClick={() => handleCompleteStep('call-routing')} className="w-full">
                    Configure Call Routing Later
                  </Button>
                  
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/call-settings">
                      Set Up Call Routing Now
                    </Link>
                  </Button>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Test Your Setup</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Make a test call to verify your AI assistant is working correctly.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium mb-2">Your Business Number</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-1 rounded border font-mono">
                        {progress.twilioCredentials?.phoneNumber || 'Not configured'}
                      </code>
                      {progress.twilioCredentials?.phoneNumber && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(progress.twilioCredentials!.phoneNumber, 'phone')}
                        >
                          {copiedField === 'phone' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Testing Steps:</h4>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                        Call your business number from your personal phone
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                        Verify the AI answers with your business greeting
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                        Ask a question about your business
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                        Check call logs in your dashboard
                      </li>
                    </ol>
                  </div>

                  <Button onClick={() => handleCompleteStep('testing')} className="w-full">
                    Test Call Completed Successfully
                  </Button>
                </div>
              )}

              {currentStep === 8 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">SMS Configuration (Optional)</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enable SMS messaging with A2P 10DLC registration. This process takes 3-4 weeks but is optional.
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Voice calls are already working! SMS is optional and requires government registration.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">What's Required</h4>
                      <ul className="text-sm space-y-1">
                        <li>• A2P 10DLC registration with carriers</li>
                        <li>• Business verification ($44 + $15 fees)</li>
                        <li>• 3-4 week approval process</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" asChild>
                        <Link href="/settings/sms">
                          Start SMS Setup
                        </Link>
                      </Button>
                      <Button onClick={() => handleCompleteStep('sms-setup')}>
                        Skip SMS Setup
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium mb-2">🎉 Setup Complete!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your AI Call Assistant is ready to handle calls. You can always configure SMS later.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <Separator className="my-6" />
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {currentStep < onboardingSteps.length - 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep + 1)}
                    >
                      Skip
                    </Button>
                  )}
                  
                  {progress.setupComplete && (
                    <Button asChild>
                      <Link href="/dashboard">
                        Go to Dashboard
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}