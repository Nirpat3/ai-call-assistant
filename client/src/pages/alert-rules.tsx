import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Bell, 
  Clock,
  Users,
  Target,
  Settings,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    callDuration?: number;
    waitTime?: number;
    priority?: string;
    callerType?: string;
    keywords?: string[];
  };
  actions: {
    notifyTeam?: boolean;
    escalate?: boolean;
    sendEmail?: boolean;
    sendSMS?: boolean;
    webhookUrl?: string;
  };
  isActive: boolean;
  triggeredCount: number;
  lastTriggered?: Date;
}

export default function AlertRulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);

  // Mock data
  const alertRules: AlertRule[] = [
    {
      id: "rule_001",
      name: "Long Wait Time Alert",
      description: "Alert when customers wait longer than 2 minutes",
      conditions: {
        waitTime: 120,
        priority: "high"
      },
      actions: {
        notifyTeam: true,
        sendEmail: true
      },
      isActive: true,
      triggeredCount: 23,
      lastTriggered: new Date(Date.now() - 3600000)
    },
    {
      id: "rule_002",
      name: "VIP Customer Alert",
      description: "Immediate notification for VIP customer calls",
      conditions: {
        callerType: "vip"
      },
      actions: {
        notifyTeam: true,
        escalate: true,
        sendSMS: true
      },
      isActive: true,
      triggeredCount: 12,
      lastTriggered: new Date(Date.now() - 7200000)
    }
  ];

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-orange-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Alert Rules</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg">Custom notification rules based on call priority and context</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowRuleDialog(true)}
                  className="bg-orange-600 hover:bg-orange-700 rounded-xl px-4 sm:px-6 text-sm sm:text-base"
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
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{alertRules.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Active Rules</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {alertRules.reduce((acc, rule) => acc + rule.triggeredCount, 0)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Triggers</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {alertRules.filter(r => r.isActive).length}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Active</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">98%</div>
              <p className="text-xs sm:text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Rules List */}
        <div className="space-y-4">
          {alertRules.map((rule) => (
            <Card key={rule.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{rule.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                          {rule.triggeredCount} triggers
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 text-sm sm:text-base line-clamp-2">{rule.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 text-sm">Conditions</h4>
                        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                          {rule.conditions.waitTime && (
                            <div>Wait time &gt; {rule.conditions.waitTime}s</div>
                          )}
                          {rule.conditions.priority && (
                            <div>Priority: {rule.conditions.priority}</div>
                          )}
                          {rule.conditions.callerType && (
                            <div>Caller type: {rule.conditions.callerType}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 text-sm">Actions</h4>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {rule.actions.notifyTeam && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Notify Team</span>
                              <span className="sm:hidden">Team</span>
                            </Badge>
                          )}
                          {rule.actions.sendEmail && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              Email
                            </Badge>
                          )}
                          {rule.actions.sendSMS && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              SMS
                            </Badge>
                          )}
                          {rule.actions.escalate && (
                            <Badge variant="outline" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Escalate</span>
                              <span className="sm:hidden">Up</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {rule.lastTriggered && (
                      <div className="mt-4 text-xs sm:text-sm text-gray-500">
                        Last triggered: {rule.lastTriggered.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 sm:flex-col sm:w-auto w-full justify-end sm:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRule(rule)}
                      className="rounded-xl flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4 sm:mr-0" />
                      <span className="ml-2 sm:hidden">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-0" />
                      <span className="ml-2 sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppStoreLayout>
  );
}