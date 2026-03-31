import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUp, 
  Plus, 
  Edit, 
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Settings
} from "lucide-react";
import AppStoreLayout from "@/components/AppStoreLayout";

interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  trigger: {
    condition: string;
    threshold: number;
    timeframe: number;
  };
  steps: Array<{
    level: number;
    action: string;
    recipients: string[];
    waitTime: number;
  }>;
  isActive: boolean;
  triggeredCount: number;
}

export default function EscalationPoliciesPage() {
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);

  // Mock data
  const policies: EscalationPolicy[] = [
    {
      id: "policy_001",
      name: "Critical Call Escalation",
      description: "Escalate calls marked as critical or emergency",
      trigger: {
        condition: "critical_priority",
        threshold: 1,
        timeframe: 0
      },
      steps: [
        {
          level: 1,
          action: "notify_supervisor",
          recipients: ["supervisor@company.com"],
          waitTime: 0
        },
        {
          level: 2,
          action: "notify_manager",
          recipients: ["manager@company.com"],
          waitTime: 5
        },
        {
          level: 3,
          action: "notify_executive",
          recipients: ["ceo@company.com"],
          waitTime: 15
        }
      ],
      isActive: true,
      triggeredCount: 8
    },
    {
      id: "policy_002",
      name: "Long Wait Time Escalation",
      description: "Escalate when customers wait too long",
      trigger: {
        condition: "wait_time",
        threshold: 300,
        timeframe: 300
      },
      steps: [
        {
          level: 1,
          action: "notify_team_lead",
          recipients: ["teamlead@company.com"],
          waitTime: 60
        },
        {
          level: 2,
          action: "add_additional_agent",
          recipients: ["operations@company.com"],
          waitTime: 120
        }
      ],
      isActive: true,
      triggeredCount: 23
    }
  ];

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-red-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <ArrowUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Escalation Policies</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg line-clamp-2">Automated escalation workflows for critical situations</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPolicyDialog(true)}
                  className="bg-red-600 hover:bg-red-700 rounded-xl px-4 sm:px-6 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Policy</span>
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
              <div className="text-xl sm:text-2xl font-bold text-red-600">{policies.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Active Policies</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {policies.reduce((acc, policy) => acc + policy.triggeredCount, 0)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Escalations</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {policies.filter(p => p.isActive).length}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Active</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">2.5min</div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        {/* Escalation Policies List */}
        <div className="space-y-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{policy.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={policy.isActive ? "default" : "secondary"} className="text-xs">
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                          {policy.triggeredCount} escalations
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 text-sm sm:text-base line-clamp-2">{policy.description}</p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Trigger Conditions</h4>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="text-sm text-gray-600 space-y-2">
                            <div className="flex justify-between">
                              <span>Condition:</span>
                              <span className="font-medium">{policy.trigger.condition.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Threshold:</span>
                              <span className="font-medium">{policy.trigger.threshold}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Timeframe:</span>
                              <span className="font-medium">{policy.trigger.timeframe}s</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Escalation Steps</h4>
                        <div className="space-y-3">
                          {policy.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                                {step.level}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {step.action.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {step.waitTime > 0 ? `After ${step.waitTime}min` : 'Immediate'}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {step.recipients.length}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
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