import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Building2, Check } from "lucide-react";
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

export default function OrganizationSelector() {
  const { toast } = useToast();
  
  const { data: user, isLoading, error } = useQuery<User>({
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

  if (isLoading) {
    return (
      <div className="px-2 py-1">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          <span>Loading organizations...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="px-2 py-1">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          <span>Personal Account</span>
        </div>
        <div className="text-xs text-gray-400 px-2 mt-1">
          No organizations configured
        </div>
      </div>
    );
  }

  const currentOrg = user.organizations?.find(org => org.id === user.currentOrganizationId);

  if (!user.organizations || user.organizations.length === 0) {
    return (
      <div className="px-2 py-1">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          <span>Personal Account</span>
        </div>
        <div className="text-xs text-gray-400 px-2 mt-1">
          No organizations available
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <div className="text-xs font-medium text-gray-500 mb-2 px-2">
        Current Organization
      </div>
      <div className="flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-md mb-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {currentOrg?.name || "No organization selected"}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {currentOrg?.plan} plan
          </div>
        </div>
      </div>
      
      {user.organizations.length > 1 && (
        <>
          <div className="text-xs font-medium text-gray-500 mb-1 px-2">
            Switch to
          </div>
          {user.organizations
            .filter(org => org.id !== user.currentOrganizationId)
            .map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrgMutation.mutate(org.id)}
                className="flex items-center space-x-2 cursor-pointer"
                disabled={switchOrgMutation.isPending}
              >
                <Building2 className="h-4 w-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {org.name}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {org.plan} plan • {org.role}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
        </>
      )}
    </div>
  );
}