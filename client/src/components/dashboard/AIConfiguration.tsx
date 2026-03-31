import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AIConfigEditor from "./AIConfigEditor";
export default function AIConfiguration() {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  
  const { data: aiConfig, isLoading } = useQuery<any>({
    queryKey: ["/api/ai-config"],
  });

  const { data: callRoutes } = useQuery({
    queryKey: ["/api/call-routes"],
  });

  const handleEditConfiguration = () => {
    setEditorOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant Configuration</h3>
          <p className="text-sm text-gray-600">Customize how your AI assistant handles calls</p>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader className="border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">AI Assistant Configuration</h3>
        <p className="text-sm text-gray-600">Customize how your AI assistant handles calls</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Greeting Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Custom Greeting</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Current greeting:</p>
              <p className="text-sm text-gray-900 italic">
                "{aiConfig?.greeting || "Hello! Thank you for calling. How can I help you today?"}"
              </p>
            </div>
            <Button variant="outline" onClick={handleEditConfiguration}>
              <i className="fas fa-edit mr-2"></i>
              Edit Configuration
            </Button>
          </div>

          {/* Routing Rules */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Routing Rules</h4>
            <div className="space-y-3">
              {Array.isArray(callRoutes) && callRoutes.length > 0 ? callRoutes.map((route: any, index: number) => (
                <div key={route.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{route.name}</p>
                    <p className="text-xs text-gray-600">
                      {route.keywords?.join(", ") || "No keywords"}
                    </p>
                  </div>
                  <span className="text-xs text-primary">→ {route.forwardTo}</span>
                </div>
              )) : (
                <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">
                  <p className="text-sm">No routing rules configured</p>
                </div>
              )}
              
              {/* Business Hours */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Business Hours</p>
                  <p className="text-xs text-gray-600">
                    {aiConfig?.businessHours ? 
                      `${(aiConfig.businessHours as any).start} - ${(aiConfig.businessHours as any).end} ${(aiConfig.businessHours as any).timezone}` :
                      "9 AM - 6 PM EST"
                    }
                  </p>
                </div>
                <span className="text-xs text-primary">→ Direct Connect</span>
              </div>
            </div>
            <Button variant="outline" onClick={handleEditConfiguration}>
              <i className="fas fa-cog mr-2"></i>
              Configure Rules
            </Button>
          </div>
        </div>
      </CardContent>
      
      <AIConfigEditor 
        open={editorOpen} 
        onClose={() => setEditorOpen(false)} 
      />
    </Card>
  );
}
