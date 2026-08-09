import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Settings, Plus, Shield, Search, MoreVertical, KeyRound, Mail, Copy, Edit2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Organization, UserWithOrganizations, UserRole } from '@shared/schema';
import { rolePermissions } from '@shared/permissions';

const organizationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  domain: z.string().optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']),
});

const userFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationId: z.string().min(1, 'Organization is required'),
  role: z.string().min(1, 'Role is required'),
});

type OrganizationForm = z.infer<typeof organizationFormSchema>;
type UserForm = z.infer<typeof userFormSchema>;

type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'export' | 'manage';

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Partial<Record<string, PermissionAction[]>>;
  isPredefined?: boolean;
}

const permissionModules = ['organizations', 'users', 'calls', 'contacts', 'settings', 'reports', 'billing', 'integrations'];
const permissionActions: PermissionAction[] = ['read', 'create', 'update', 'delete', 'export', 'manage'];

const defaultRoleDefinitions: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full administrative access across the organization.',
    isPredefined: true,
    permissions: rolePermissions.admin,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage team users, customers, calls, and reports.',
    isPredefined: true,
    permissions: rolePermissions.manager,
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Standard workspace access for daily operations.',
    isPredefined: true,
    permissions: rolePermissions.member,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access for monitoring and review.',
    isPredefined: true,
    permissions: rolePermissions.viewer,
  },
];

export default function AdminPortal() {
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrganizations | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() => {
    const savedRoles = localStorage.getItem('adminRoleDefinitions');
    if (!savedRoles) return defaultRoleDefinitions;

    try {
      return JSON.parse(savedRoles) as RoleDefinition[];
    } catch {
      return defaultRoleDefinitions;
    }
  });
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleDefinition>({
    id: '',
    name: '',
    description: '',
    permissions: Object.fromEntries(permissionModules.map((module) => [module, [] as PermissionAction[]])),
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/organizations'],
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: OrganizationForm) => {
      return await apiRequest('/api/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      setShowCreateOrg(false);
      toast({ title: 'Organization created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create organization', description: error.message, variant: 'destructive' });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreateUser(false);
      toast({ title: 'User created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create user', description: error.message, variant: 'destructive' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: (_, email) => {
      toast({ title: 'Password reset requested', description: `Reset instructions were requested for ${email}.` });
    },
    onError: (error) => {
      toast({ title: 'Failed to request reset', description: error.message, variant: 'destructive' });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Password updated', description: 'You can now share the new password with the user.' });
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    },
    onError: (error) => {
      toast({ title: 'Failed to update password', description: error.message, variant: 'destructive' });
    },
  });

  const orgForm = useForm<OrganizationForm>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      domain: '',
      plan: 'basic',
    },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      organizationId: '',
      role: 'member',
    },
  });

  useEffect(() => {
    localStorage.setItem('adminRoleDefinitions', JSON.stringify(roleDefinitions));
  }, [roleDefinitions]);

  const roleOptions = roleDefinitions.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  const openSetPassword = (user: UserWithOrganizations) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordDialog(true);
  };

  const generatePassword = () => {
    const random = Math.random().toString(36).slice(2, 10);
    setNewPassword(`Temp-${random}!`);
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    toast({ title: 'Password copied' });
  };

  const startRoleEdit = (role: RoleDefinition) => {
    setRoleDraft({
      ...role,
      permissions: Object.fromEntries(permissionModules.map((module) => [
        module,
        [...(role.permissions[module] || [])],
      ])),
    });
    setEditingRoleId(role.id);
  };

  const startRoleCreate = () => {
    setRoleDraft({
      id: '',
      name: '',
      description: '',
      permissions: Object.fromEntries(permissionModules.map((module) => [module, [] as PermissionAction[]])),
    });
    setEditingRoleId(null);
    setShowCreateRole(true);
  };

  const togglePermission = (module: string, action: PermissionAction) => {
    setRoleDraft((draft) => {
      const current = draft.permissions[module] || [];
      const next = current.includes(action)
        ? current.filter((item) => item !== action)
        : [...current, action];

      return {
        ...draft,
        permissions: {
          ...draft.permissions,
          [module]: next,
        },
      };
    });
  };

  const saveRole = () => {
    const trimmedName = roleDraft.name.trim();
    if (!trimmedName) {
      toast({ title: 'Role name is required', variant: 'destructive' });
      return;
    }

    const normalizedId = roleDraft.id || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const roleToSave = { ...roleDraft, id: normalizedId, name: trimmedName };

    setRoleDefinitions((roles) => {
      if (editingRoleId) {
        return roles.map((role) => role.id === editingRoleId ? { ...roleToSave, isPredefined: role.isPredefined } : role);
      }
      return [...roles, roleToSave];
    });

    setEditingRoleId(null);
    setShowCreateRole(false);
    toast({ title: editingRoleId ? 'Role updated' : 'Role created' });
  };

  const filteredOrganizations = organizations.filter((org: Organization) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter((user: UserWithOrganizations) =>
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'member': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'pro': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'basic': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage organizations, users, and system-wide settings
          </p>
        </div>
        <div className="flex space-x-4">
          <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <Form {...orgForm}>
                <form onSubmit={orgForm.handleSubmit((data) => createOrgMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={orgForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={orgForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={orgForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={orgForm.control}
                    name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateOrg(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createOrgMutation.isPending}>
                      {createOrgMutation.isPending ? 'Creating...' : 'Create Organization'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={userForm.control}
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
                      control={userForm.control}
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
                    control={userForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organizations.map((org: Organization) => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
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
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Set User Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm text-gray-600 dark:text-gray-300">
              {selectedUser ? (
                <span>
                  Setting password for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email})
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="flex gap-2">
                <Input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter or generate a password"
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500">Minimum 8 characters. Share this password with the user through your approved channel.</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={copyPassword} disabled={!newPassword}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!selectedUser || newPassword.length < 8 || setPasswordMutation.isPending}
                  onClick={() => selectedUser && setPasswordMutation.mutate({ userId: selectedUser.id, password: newPassword })}
                >
                  {setPasswordMutation.isPending ? 'Saving...' : 'Set Password'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateRole || !!editingRoleId} onOpenChange={(open) => {
        if (!open) {
          setShowCreateRole(false);
          setEditingRoleId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoleId ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  value={roleDraft.name}
                  onChange={(event) => setRoleDraft((draft) => ({ ...draft, name: event.target.value }))}
                  placeholder="Operations Manager"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Key</label>
                <Input
                  value={roleDraft.id}
                  onChange={(event) => setRoleDraft((draft) => ({ ...draft, id: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="operations-manager"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={roleDraft.description}
                onChange={(event) => setRoleDraft((draft) => ({ ...draft, description: event.target.value }))}
                placeholder="Describe what this role can do"
              />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Permissions</h3>
                <p className="text-sm text-gray-500">Scroll to select all available line items.</p>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border">
                {permissionModules.map((module) => (
                  <div key={module} className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-3 border-b p-4 last:border-b-0">
                    <div className="font-medium capitalize">{module}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {permissionActions.map((action) => {
                        const checked = roleDraft.permissions[module]?.includes(action) || false;
                        return (
                          <label key={action} className="flex items-center gap-2 text-sm capitalize">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(module, action)}
                              className="h-4 w-4"
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateRole(false);
                setEditingRoleId(null);
              }}>
                Cancel
              </Button>
              <Button type="button" onClick={saveRole}>
                <Save className="w-4 h-4 mr-2" />
                Save Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search organizations and users..."
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
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Organizations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {organizations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Plans</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {organizations.filter((org: Organization) => org.isActive).length}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter((user: UserWithOrganizations) => 
                    user.organizations.some(uo => uo.role === 'admin')
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <div className="grid gap-6">
            {orgsLoading ? (
              <div className="text-center py-8">Loading organizations...</div>
            ) : (
              filteredOrganizations.map((org: Organization) => (
                <Card key={org.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {org.name}
                          </h3>
                          <Badge className={getPlanBadgeColor(org.plan)}>
                            {org.plan.toUpperCase()}
                          </Badge>
                          {!org.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Slug: {org.slug}
                        </p>
                        {org.domain && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Domain: {org.domain}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Created: {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-6">
            {usersLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              filteredUsers.map((user: UserWithOrganizations) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          {user.organizations.map((uo) => (
                            <Badge key={uo.organizationId} className={getRoleBadgeColor(uo.role as UserRole)}>
                              {uo.role}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          @{user.username} • {user.email}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.organizations.map((uo) => (
                            <Badge key={uo.organizationId} variant="outline">
                              {uo.organization.name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => user.email && resetPasswordMutation.mutate(user.email)}
                          disabled={!user.email || resetPasswordMutation.isPending}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reset
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openSetPassword(user)}>
                          <KeyRound className="w-4 h-4 mr-2" />
                          Set Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roles</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Edit predefined roles or create custom roles for user assignment.
              </p>
            </div>
            <Button onClick={startRoleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>

          <div className="grid gap-6">
            {roleDefinitions.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                        {role.isPredefined && <Badge variant="outline">Predefined</Badge>}
                        <Badge className={getRoleBadgeColor(role.id as UserRole)}>{role.id}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{role.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(role.permissions).map(([module, actions]) => (
                          (actions || []).length > 0 ? (
                            <Badge key={module} variant="outline" className="capitalize">
                              {module}: {(actions || []).join(', ')}
                            </Badge>
                          ) : null
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startRoleEdit(role)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                System-wide configuration options coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
