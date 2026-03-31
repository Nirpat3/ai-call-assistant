import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Search, 
  Download,
  ExternalLink,
  FileText,
  Code,
  Settings,
  HelpCircle,
  Lightbulb,
  Shield,
  Zap,
  Users,
  BarChart3
} from "lucide-react";
import AppStoreLayout from "@/components/AppStoreLayout";

interface DocumentationPageProps {
  type: 'user-guide' | 'api-docs' | 'developer-docs';
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  content?: string;
}

export default function DocumentationPage({ type = 'user-guide' }: DocumentationPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<DocSection | null>(null);

  const userGuideSections: DocSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Quick setup and initial configuration guide",
      icon: Zap,
      category: "Basics",
      level: "beginner",
      estimatedTime: "10 min",
      content: `# Getting Started

Welcome to AI Call Assistant! This guide will help you get up and running quickly.

## First Time Setup

### 1. Access the Dashboard
Navigate to your AI Call Assistant instance and log in with your credentials.

### 2. Quick Setup Wizard
The system will guide you through initial configuration:
- Business Information
- Phone Configuration  
- AI Configuration

### 3. Test Your Setup
After completing the wizard:
- Make a test call to your number
- Verify AI responses
- Check call routing`
    },
    {
      id: "call-management",
      title: "Call Management",
      description: "Managing incoming calls, routing, and live monitoring",
      icon: FileText,
      category: "Core Features",
      level: "beginner",
      estimatedTime: "15 min",
      content: `# Call Management

Learn how to effectively manage your incoming calls with AI assistance.

## Live Call Monitoring
- View active calls in real-time
- Monitor AI performance
- Track call metrics

## Call Routing
- Set up intelligent routing rules
- Configure department-specific handling
- Manage business hours routing

## Call Analytics
- Review call history
- Analyze performance metrics
- Generate reports`
    },
    {
      id: "ai-configuration",
      title: "AI Configuration",
      description: "Configuring and training your AI assistant",
      icon: Settings,
      category: "AI Features",
      level: "intermediate",
      estimatedTime: "20 min",
      content: `# AI Configuration

Configure and optimize your AI assistant for your business needs.

## AI Personality
- Set greeting messages
- Configure response style
- Customize conversation tone

## Intent Recognition
- Train AI to understand caller needs
- Add custom intents
- Improve recognition accuracy

## Knowledge Base
- Add business-specific information
- Create FAQ responses
- Maintain knowledge currency`
    },
    {
      id: "analytics",
      title: "Analytics & Reporting",
      description: "Understanding your call data and AI performance",
      icon: BarChart3,
      category: "Analytics",
      level: "intermediate",
      estimatedTime: "25 min",
      content: `# Analytics & Reporting

Make data-driven decisions with comprehensive analytics.

## Call Analytics
- Monitor call volume and patterns
- Track success rates
- Identify optimization opportunities

## AI Performance
- Review accuracy metrics
- Monitor learning progress
- Track automation rates

## Business Intelligence
- Executive dashboards
- Custom reports
- Trend analysis`
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      description: "Common issues and solutions",
      icon: HelpCircle,
      category: "Support",
      level: "beginner",
      estimatedTime: "10 min",
      content: `# Troubleshooting

Quick solutions to common issues.

## Common Problems
- Login issues
- Call routing problems
- AI performance issues
- Integration failures

## Self-Help Tools
- System health checker
- Configuration validator
- Log analyzer
- Performance monitor

## Getting Support
- Support ticket system
- Community forums
- Documentation search
- Video tutorials`
    }
  ];

  const apiDocsSections: DocSection[] = [
    {
      id: "api-overview",
      title: "API Overview",
      description: "Introduction to the AI Call Assistant API",
      icon: Code,
      category: "Getting Started",
      level: "intermediate",
      estimatedTime: "5 min",
      content: `# API Overview

The AI Call Assistant provides a comprehensive REST API for integration.

## Base URL
\`\`\`
https://your-domain.com/api
\`\`\`

## Authentication
All API requests require JWT authentication:
\`\`\`http
Authorization: Bearer your_jwt_token
\`\`\`

## Rate Limiting
- 1000 requests per hour for standard endpoints
- 100 requests per hour for analytics endpoints`
    },
    {
      id: "call-endpoints",
      title: "Call Management API",
      description: "Endpoints for managing calls and call data",
      icon: FileText,
      category: "Endpoints",
      level: "intermediate",
      estimatedTime: "15 min",
      content: `# Call Management API

Manage calls programmatically through the API.

## Get Calls
\`\`\`http
GET /api/calls
\`\`\`

Query Parameters:
- \`page\` (number): Page number
- \`limit\` (number): Results per page
- \`status\` (string): Filter by status

## Get Call Details
\`\`\`http
GET /api/calls/{call_id}
\`\`\`

Returns detailed call information including transcript and analytics.`
    },
    {
      id: "webhooks",
      title: "Webhooks",
      description: "Real-time notifications via webhooks",
      icon: Zap,
      category: "Integration",
      level: "advanced",
      estimatedTime: "20 min",
      content: `# Webhooks

Receive real-time notifications about call events.

## Setup
1. Go to System Settings > Integrations
2. Add webhook URL
3. Select events to receive

## Events
- call.started
- call.completed
- call.transferred
- ai.response.generated

## Security
All webhooks include HMAC signatures for verification.`
    },
    {
      id: "sdks",
      title: "SDK Libraries",
      description: "Official SDKs for popular programming languages",
      icon: Code,
      category: "SDKs",
      level: "intermediate",
      estimatedTime: "10 min",
      content: `# SDK Libraries

Official SDKs available for:
- JavaScript/Node.js
- Python
- PHP
- Ruby

## Node.js Example
\`\`\`javascript
const AICallAssistant = require('@ai-call-assistant/sdk');

const client = new AICallAssistant({
  apiToken: 'your_token_here',
  baseUrl: 'https://your-domain.com/api'
});

const calls = await client.calls.list({
  limit: 10,
  status: 'completed'
});
\`\`\``
    }
  ];

  const currentSections = type === 'api-docs' ? apiDocsSections : userGuideSections;

  const filteredSections = currentSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(currentSections.map(s => s.category))];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case 'api-docs': return 'API Documentation';
      case 'developer-docs': return 'Developer Documentation';
      default: return 'User Guide';
    }
  };

  const getPageDescription = () => {
    switch (type) {
      case 'api-docs': return 'Complete API reference and integration examples';
      case 'developer-docs': return 'Technical documentation for developers';
      default: return 'Comprehensive guide to using AI Call Assistant';
    }
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 rounded-3xl shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
                  <p className="text-gray-600 mt-1 text-lg">{getPageDescription()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Documentation Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map(category => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {filteredSections
                        .filter(section => section.category === category)
                        .map(section => {
                          const IconComponent = section.icon;
                          return (
                            <button
                              key={section.id}
                              onClick={() => setSelectedSection(section)}
                              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                                selectedSection?.id === section.id
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <IconComponent className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">
                                    {section.title}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {section.estimatedTime}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedSection ? (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <selectedSection.icon className="w-5 h-5 text-blue-600" />
                        {selectedSection.title}
                      </CardTitle>
                      <p className="text-gray-600 mt-2">{selectedSection.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getLevelColor(selectedSection.level)}>
                        {selectedSection.level}
                      </Badge>
                      <Badge variant="outline">
                        {selectedSection.estimatedTime}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {selectedSection.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Select a Documentation Section
                  </h3>
                  <p className="text-gray-500">
                    Choose a topic from the sidebar to view detailed documentation
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="justify-start rounded-xl">
                <ExternalLink className="w-4 h-4 mr-2" />
                Video Tutorials
              </Button>
              <Button variant="outline" className="justify-start rounded-xl">
                <Users className="w-4 h-4 mr-2" />
                Community Forum
              </Button>
              <Button variant="outline" className="justify-start rounded-xl">
                <HelpCircle className="w-4 h-4 mr-2" />
                Support Center
              </Button>
              <Button variant="outline" className="justify-start rounded-xl">
                <Lightbulb className="w-4 h-4 mr-2" />
                Feature Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppStoreLayout>
  );
}