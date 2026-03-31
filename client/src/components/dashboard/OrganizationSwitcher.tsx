import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2, Check, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface User {
  id: number;
  currentOrganizationId: string;
  organizations: Organization[];
}

export default function OrganizationSwitcher() {
  const { toast } = useToast();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user/organizations"],
    retry: false,
  });

  const switchOrgMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await fetch(`/api/user/switch-organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId }),
      });
      if (!response.ok) throw new Error("Failed to switch organization");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calls/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Organization switched",
        description: "Successfully switched to the selected organization.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to switch organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg animate-pulse">
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const currentOrg = user.organizations?.find(org => org.id === user.currentOrganizationId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 px-3 py-2 h-auto bg-white border-gray-200 hover:bg-gray-50"
        >
          <Building2 className="w-4 h-4 text-gray-500" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate max-w-32">
              {currentOrg?.name || "Select Organization"}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {currentOrg?.plan} plan
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {user.organizations?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrgMutation.mutate(org.id)}
            className="flex items-center justify-between p-3 cursor-pointer"
            disabled={switchOrgMutation.isPending}
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">{org.name}</span>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="capitalize">{org.plan}</span>
                <span>•</span>
                <span className="capitalize">{org.role}</span>
              </div>
            </div>
            {org.id === user.currentOrganizationId && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="flex items-center space-x-2 p-3 cursor-pointer">
          <Plus className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Create Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}