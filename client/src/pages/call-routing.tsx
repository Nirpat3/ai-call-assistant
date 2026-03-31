import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Route, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight, 
  Clock, 
  Users, 
  Phone,
  Target,
  Settings,
  AlertTriangle,
  CheckCircle,
  Star,
  Filter,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface RoutingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditions: {
    callerNumbers?: string[];
    keywords?: string[];
    timeRanges?: Array<{
      days: string[];
      startTime: string;
      endTime: string;
    }>;
    callerType?: 'vip' | 'regular' | 'new' | 'blocked';
    department?: string;
    previousCalls?: number;
  };
  actions: {
    destination: 'ai' | 'human' | 'voicemail' | 'queue' | 'external';
    agentGroup?: string;
    message?: string;
    transferNumber?: string;
    queueMusic?: string;
    maxWaitTime?: number;
  };
  statistics: {
    totalCalls: number;
    successfulRoutes: number;
    averageWaitTime: number;
    lastTriggered?: Date;
  };
}

interface Department {
  id: string;
  name: string;
  description: string;
  agents: Array<{
    id: string;
    name: string;
    extension: string;
    status: 'available' | 'busy' | 'offline';
  }>;
  businessHours: {
    enabled: boolean;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  };
}

export default function CallRoutingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<RoutingRule | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Mock data for demonstration
  const routingRules: RoutingRule[] = [
    {
      id: "rule_001",
      name: "VIP Customer Priority",
      description: "Route VIP customers directly to senior agents",
      priority: 1,
      isActive: true,
      conditions: {
        callerType: 'vip',
        timeRanges: [
          { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '09:00', endTime: '17:00' }
        ]
      },
      actions: {
        destination: 'human',
        agentGroup: 'senior_agents',
        message: "Thank you for calling. You're being connected to our VIP support team."
      },
      statistics: {
        totalCalls: 145,
        successfulRoutes: 142,
        averageWaitTime: 45,
        lastTriggered: new Date(Date.now() - 3600000)
      }
    },
    {
      id: "rule_002",
      name: "After Hours Routing",
      description: "Route calls to AI assistant outside business hours",
      priority: 2,
      isActive: true,
      conditions: {
        timeRanges: [
          { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '17:01', endTime: '08:59' },
          { days: ['saturday', 'sunday'], startTime: '00:00', endTime: '23:59' }
        ]
      },
      actions: {
        destination: 'ai',
        message: "Thank you for calling. Our AI assistant Maya will help you today."
      },
      statistics: {
        totalCalls: 289,
        successfulRoutes: 285,
        averageWaitTime: 0,
        lastTriggered: new Date(Date.now() - 1800000)
      }
    },
    {
      id: "rule_003",
      name: "Billing Inquiries",
      description: "Route billing-related calls to accounting department",
      priority: 3,
      isActive: true,
      conditions: {
        keywords: ['billing', 'payment', 'invoice', 'account balance', 'charge']
      },
      actions: {
        destination: 'human',
        agentGroup: 'billing_team',
        message: "I'll connect you with our billing specialist."
      },
      statistics: {
        totalCalls: 78,
        successfulRoutes: 76,
        averageWaitTime: 120,
        lastTriggered: new Date(Date.now() - 7200000)
      }
    }
  ];

  const departments: Department[] = [
    {
      id: "dept_001",
      name: "Customer Support",
      description: "General customer inquiries and support",
      agents: [
        { id: "agent_001", name: "John Smith", extension: "101", status: "available" },
        { id: "agent_002", name: "Sarah Johnson", extension: "102", status: "busy" }
      ],
      businessHours: {
        enabled: true,
        schedule: {
          monday: { start: "09:00", end: "17:00", enabled: true },
          tuesday: { start: "09:00", end: "17:00", enabled: true },
          wednesday: { start: "09:00", end: "17:00", enabled: true },
          thursday: { start: "09:00", end: "17:00", enabled: true },
          friday: { start: "09:00", end: "17:00", enabled: true },
          saturday: { start: "10:00", end: "14:00", enabled: false },
          sunday: { start: "10:00", end: "14:00", enabled: false }
        }
      }
    }
  ];

  const filteredRules = routingRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterActive === null || rule.isActive === filterActive;
    return matchesSearch && matchesFilter;
  });

  const getDestinationIcon = (destination: string) => {
    switch (destination) {
      case 'ai': return <Target className="w-4 h-4 text-blue-500" />;
      case 'human': return <Users className="w-4 h-4 text-green-500" />;
      case 'voicemail': return <Phone className="w-4 h-4 text-purple-500" />;
      case 'queue': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-blue-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <Route className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Call Routing</h1>
                    <Badge className="bg-blue-100 text-blue-800 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold">
                      Beta
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm sm:text-lg line-clamp-2">Intelligent call routing rules and department management</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowRuleDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-4 sm:px-6 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Rule</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredRules.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Active Rules</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {Math.round(routingRules.reduce((acc, rule) => acc + (rule.statistics.successfulRoutes / rule.statistics.totalCalls * 100), 0) / routingRules.length)}%
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {Math.round(routingRules.reduce((acc, rule) => acc + rule.statistics.averageWaitTime, 0) / routingRules.length)}s
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Wait Time</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{departments.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Departments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="rules" className="rounded-lg text-xs sm:text-sm">
              <span className="hidden sm:inline">Routing Rules</span>
              <span className="sm:hidden">Rules</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-lg text-xs sm:text-sm">
              <span className="hidden sm:inline">Departments</span>
              <span className="sm:hidden">Depts</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs sm:text-sm">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4 sm:space-y-6">
            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search routing rules..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-2xl"
                    />
                  </div>
                  <Select value={filterActive?.toString() || "all"} onValueChange={(v) => setFilterActive(v === "all" ? null : v === "true")}>
                    <SelectTrigger className="w-48 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rules</SelectItem>
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Routing Rules */}
            <div className="space-y-4">
              {filteredRules.map((rule) => (
                <Card key={rule.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPriorityBadge(rule.priority)}>
                            <span className="hidden sm:inline">Priority </span>P{rule.priority}
                          </Badge>
                          {rule.isActive ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{rule.name}</h3>
                            <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs w-fit">
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3 text-sm sm:text-base line-clamp-2">{rule.description}</p>
                          
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              {getDestinationIcon(rule.actions.destination)}
                              <span className="truncate">
                                <span className="hidden sm:inline">Routes to </span>
                                {rule.actions.destination}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{rule.statistics.totalCalls} calls</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{Math.round(rule.statistics.successfulRoutes / rule.statistics.totalCalls * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{rule.statistics.averageWaitTime}s</span>
                            </div>
                          </div>

                          {/* Conditions Preview */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {rule.conditions.callerType && (
                              <Badge variant="outline" className="rounded-lg">
                                {rule.conditions.callerType} callers
                              </Badge>
                            )}
                            {rule.conditions.keywords && (
                              <Badge variant="outline" className="rounded-lg">
                                Keywords: {rule.conditions.keywords.slice(0, 2).join(', ')}
                                {rule.conditions.keywords.length > 2 && ` +${rule.conditions.keywords.length - 2} more`}
                              </Badge>
                            )}
                            {rule.conditions.timeRanges && (
                              <Badge variant="outline" className="rounded-lg">
                                Time-based routing
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRule(rule)}
                          className="rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departments.map((dept) => (
                <Card key={dept.id} className="bg-white border-gray-200 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{dept.name}</span>
                      <Badge variant="outline">{dept.agents.length} agents</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{dept.description}</p>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Agents</h4>
                      <div className="space-y-2">
                        {dept.agents.map((agent) => (
                          <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                agent.status === 'available' ? 'bg-green-500' :
                                agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                              }`} />
                              <span className="font-medium">{agent.name}</span>
                              <span className="text-sm text-gray-500">Ext. {agent.extension}</span>
                            </div>
                            <Badge variant={agent.status === 'available' ? 'default' : 'secondary'}>
                              {agent.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Business Hours</h4>
                      <div className="text-sm text-gray-600">
                        {dept.businessHours.enabled ? (
                          <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                        ) : (
                          <p>24/7 Coverage</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <Route className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-gray-500">Detailed routing performance metrics and optimization suggestions</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}