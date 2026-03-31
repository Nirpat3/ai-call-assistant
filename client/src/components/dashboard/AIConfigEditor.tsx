import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIConfigEditorProps {
  open: boolean;
  onClose: () => void;
}

export default function AIConfigEditor({ open, onClose }: AIConfigEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: aiConfig, isLoading } = useQuery<any>({
    queryKey: ["/api/ai-config"],
    enabled: open,
  });

  const [greeting, setGreeting] = useState("");
  const [businessHours, setBusinessHours] = useState({
    start: "09:00",
    end: "18:00",
    timezone: "EST",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
  });
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  // Initialize form when data loads
  useEffect(() => {
    if (aiConfig) {
      setGreeting(aiConfig.greeting);
      setBusinessHours(aiConfig.businessHours as any || businessHours);
      setRoutingRules(aiConfig.routingRules as any || []);
    }
  }, [aiConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return await apiRequest("/api/ai-config", { method: "PUT", body: JSON.stringify(config) });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "AI assistant configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-config"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update configuration: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      greeting,
      businessHours,
      routingRules
    });
  };

  const addRoutingRule = () => {
    setRoutingRules([...routingRules, {
      name: "New Rule",
      keywords: [],
      forwardTo: "",
      priority: routingRules.length + 1
    }]);
  };

  const updateRoutingRule = (index: number, field: string, value: any) => {
    const updated = [...routingRules];
    updated[index] = { ...updated[index], [field]: value };
    setRoutingRules(updated);
  };

  const removeRoutingRule = (index: number) => {
    setRoutingRules(routingRules.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Assistant Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded mb-6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Assistant Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-6">
          {/* Greeting Configuration */}
          <div className="space-y-4">
            <Label htmlFor="greeting" className="text-base font-semibold">
              Custom Greeting Message
            </Label>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Enter the greeting message callers will hear..."
              className="min-h-[100px]"
            />
            <p className="text-sm text-gray-600">
              This message will be played when callers first connect to your AI assistant.
            </p>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Business Hours</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={businessHours.start}
                  onChange={(e) => setBusinessHours({ ...businessHours, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={businessHours.end}
                  onChange={(e) => setBusinessHours({ ...businessHours, end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={businessHours.timezone}
                onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
                placeholder="EST, PST, GMT, etc."
              />
            </div>
          </div>

          {/* Routing Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Call Routing Rules</Label>
              <Button onClick={addRoutingRule} size="sm">
                Add Rule
              </Button>
            </div>
            
            {routingRules.map((rule, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={rule.name}
                    onChange={(e) => updateRoutingRule(index, "name", e.target.value)}
                    placeholder="Rule name"
                    className="flex-1 mr-2"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeRoutingRule(index)}
                  >
                    Remove
                  </Button>
                </div>
                
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    value={rule.keywords?.join(", ") || ""}
                    onChange={(e) => updateRoutingRule(index, "keywords", e.target.value.split(",").map((k: string) => k.trim()))}
                    placeholder="pricing, quote, sales, support, help"
                  />
                </div>
                
                <div>
                  <Label>Forward To</Label>
                  <Input
                    value={rule.forwardTo}
                    onChange={(e) => updateRoutingRule(index, "forwardTo", e.target.value)}
                    placeholder="Phone number or email"
                  />
                </div>
                
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={rule.priority}
                    onChange={(e) => updateRoutingRule(index, "priority", parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
            ))}
            
            {routingRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No routing rules configured.</p>
                <p className="text-sm">Add rules to automatically route calls based on keywords.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateConfigMutation.isPending}
            >
              {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}