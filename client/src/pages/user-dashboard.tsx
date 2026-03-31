import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Users, Building2, Settings, Crown, User, Eye, ChevronDown } from 'lucide-react';
import { UserWithOrganizations, UserRole, Organization } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export default function UserDashboard() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Get current user with organizations
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const activeOrgId = selectedOrgId || currentUser?.currentOrganizationId;

  // Fetch organization-specific data
  const { data: orgStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/organizations', activeOrgId, 'stats'],
    enabled: !!activeOrgId,
  });

  // Fetch recent calls for the selected organization
  const { data: recentCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['/api/organizations', activeOrgId, 'calls/recent'],
    enabled: !!activeOrgId,
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return Crown;
      case 'member': return User;
      case 'viewer': return Eye;
      default: return User;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'member': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const currentOrgMembership = currentUser?.organizations?.find(
    (uo: any) => uo.organizationId === activeOrgId
  );

  const canManageOrg = currentOrgMembership?.role === 'admin';
  const canViewFullData = ['admin', 'member'].includes(currentOrgMembership?.role || '');

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const activeOrganization = currentUser?.organizations?.find(
    (uo: any) => uo.organizationId === activeOrgId
  )?.organization;

  return (
    <div className="p-8 space-y-8">
      {/* Header with Organization Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {currentUser?.firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Here's what's happening in your organization
          </p>
        </div>
        
        {currentUser?.organizations && currentUser.organizations.length > 1 && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Organization:
            </label>
            <Select value={activeOrgId || ''} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {currentUser.organizations.map((uo: any) => {
                  const RoleIcon = getRoleIcon(uo.role as UserRole);
                  return (
                    <SelectItem key={uo.organizationId} value={uo.organizationId}>
                      <div className="flex items-center space-x-2">
                        <span>{uo.organization.name}</span>
                        <Badge className={getRoleBadgeColor(uo.role as UserRole)} variant="outline">
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {uo.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Current Organization Info */}
      {activeOrganization && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Building2 className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {activeOrganization.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Your role: {currentOrgMembership?.role}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Plan: {activeOrganization.plan} • Domain: {activeOrganization.domain || 'Not set'}
                  </p>
                </div>
              </div>
              <Badge className={getRoleBadgeColor(currentOrgMembership?.role as UserRole)}>
                {getRoleIcon(currentOrgMembership?.role as UserRole)({ className: "w-3 h-3 mr-1" })}
                {currentOrgMembership?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Phone className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Calls Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '...' : orgStats?.callsToday || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Team Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '...' : orgStats?.totalMembers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Settings className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Automation</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '...' : `${orgStats?.automationRate || 0}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Crown className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Your Access</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentOrgMembership?.role === 'admin' ? 'Full' : 
                   currentOrgMembership?.role === 'member' ? 'Standard' : 'Read-Only'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Recent Calls</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canViewFullData && (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <Phone className="w-4 h-4 mr-2" />
                      View Call Log
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Contacts
                    </Button>
                  </>
                )}
                {canManageOrg && (
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Organization Settings
                  </Button>
                )}
                <Button className="w-full justify-start" variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {activeOrganization ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Organization:</span>
                      <span className="font-medium">{activeOrganization.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Plan:</span>
                      <span className="font-medium capitalize">{activeOrganization.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status:</span>
                      <Badge variant={activeOrganization.isActive ? "default" : "destructive"}>
                        {activeOrganization.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Member Since:</span>
                      <span className="font-medium">
                        {new Date(currentOrgMembership?.joinedAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">No organization selected</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {!canViewFullData ? (
                <p className="text-gray-600 dark:text-gray-300">
                  You don't have permission to view call data.
                </p>
              ) : callsLoading ? (
                <div className="text-center py-8">Loading calls...</div>
              ) : recentCalls.length > 0 ? (
                <div className="space-y-4">
                  {recentCalls.slice(0, 5).map((call: any) => (
                    <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {call.from} → {call.to}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                          {call.status}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(call.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">No recent calls</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {currentUser?.organizations?.map((uo: any) => {
                  const role = uo.role as UserRole;
                  const permissions = {
                    admin: ['Full access to all features', 'Manage users and settings', 'View all data', 'Export reports'],
                    member: ['View call logs', 'Manage contacts', 'Access analytics', 'Use AI features'],
                    viewer: ['View basic reports', 'Read-only access', 'Limited data visibility']
                  };

                  return (
                    <div key={uo.organizationId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {uo.organization.name}
                        </h4>
                        <Badge className={getRoleBadgeColor(role)}>
                          {getRoleIcon(role)({ className: "w-3 h-3 mr-1" })}
                          {role}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {permissions[role]?.map((permission, index) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">@{currentUser?.username}</p>
                    <p className="text-gray-600 dark:text-gray-300">{currentUser?.email}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Organization Memberships</h4>
                  <div className="space-y-2">
                    {currentUser?.organizations?.map((uo: any) => (
                      <div key={uo.organizationId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium">{uo.organization.name}</span>
                        <Badge className={getRoleBadgeColor(uo.role as UserRole)}>
                          {uo.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}