import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Settings, Plus, Phone, UserPlus, Search, MoreVertical, Crown, Eye, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserWithOrganizations, UserRole, Organization } from '@shared/schema';

const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'member', 'viewer']),
});

const organizationSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().optional(),
  settings: z.object({
    allowExternalInvites: z.boolean(),
    defaultUserRole: z.enum(['admin', 'member', 'viewer']),
    maxUsers: z.number().min(1).optional(),
  }),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;
type OrganizationSettingsForm = z.infer<typeof organizationSettingsSchema>;

export default function OrganizationPortal() {
  const { toast } = useToast();
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current organization
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const currentOrgId = currentUser?.currentOrganizationId;

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrgId],
    enabled: !!currentOrgId,
  });

  // Fetch organization members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrgId, 'members'],
    enabled: !!currentOrgId,
  });

  // Fetch organization calls
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrgId, 'calls'],
    enabled: !!currentOrgId,
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUserForm) => {
      return await apiRequest(`/api/organizations/${currentOrgId}/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrgId, 'members'] });
      setShowInviteUser(false);
      toast({ title: 'Invitation sent successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to send invitation', description: error.message, variant: 'destructive' });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: OrganizationSettingsForm) => {
      return await apiRequest(`/api/organizations/${currentOrgId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrgId] });
      toast({ title: 'Organization updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update organization', description: error.message, variant: 'destructive' });
    },
  });

  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'member',
    },
  });

  const settingsForm = useForm<OrganizationSettingsForm>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: organization?.name || '',
      domain: organization?.domain || '',
      settings: {
        allowExternalInvites: organization?.settings?.allowExternalInvites || true,
        defaultUserRole: organization?.settings?.defaultUserRole || 'member',
        maxUsers: organization?.settings?.maxUsers || undefined,
      },
    },
  });

  const filteredMembers = members.filter((member: UserWithOrganizations) =>
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const currentUserRole = currentUser?.organizations?.find(
    (uo: any) => uo.organizationId === currentOrgId
  )?.role;

  const canManageUsers = currentUserRole === 'admin';

  if (!currentOrgId || orgLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">Loading organization...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {organization?.name} Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your organization's members, settings, and activity
          </p>
        </div>
        {canManageUsers && (
          <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit((data) => inviteUserMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={inviteForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowInviteUser(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteUserMutation.isPending}>
                      {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {members.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Crown className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {members.filter((member: UserWithOrganizations) => 
                    member.organizations.some(uo => uo.organizationId === currentOrgId && uo.role === 'admin')
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Phone className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Calls Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {calls.filter((call: any) => 
                    new Date(call.startTime).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Settings className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Plan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {organization?.plan}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <div className="grid gap-6">
            {membersLoading ? (
              <div className="text-center py-8">Loading members...</div>
            ) : (
              filteredMembers.map((member: UserWithOrganizations) => {
                const memberRole = member.organizations.find(
                  uo => uo.organizationId === currentOrgId
                )?.role as UserRole;
                const RoleIcon = getRoleIcon(memberRole);

                return (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {member.firstName} {member.lastName}
                              </h3>
                              <Badge className={getRoleBadgeColor(memberRole)}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {memberRole}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              @{member.username} • {member.email}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Joined: {new Date(member.organizations.find(
                                uo => uo.organizationId === currentOrgId
                              )?.joinedAt || member.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {canManageUsers && member.id !== currentUser?.id && (
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="text-center py-8">Loading activity...</div>
              ) : calls.length > 0 ? (
                <div className="space-y-4">
                  {calls.slice(0, 10).map((call: any) => (
                    <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {call.from} → {call.to}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{call.status}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(call.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {canManageUsers ? (
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit((data) => updateOrgMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={settingsForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateOrgMutation.isPending}>
                        {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  You don't have permission to view organization settings.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}