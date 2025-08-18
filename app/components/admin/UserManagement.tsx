import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Eye, 
  Shield, 
  User, 
  UserCheck, 
  Search,
  Filter,
  Users,
  ChevronDown,
  Activity,
  Clock,
  Phone,
  Mail
} from 'lucide-react';

// Mock UserRole enum
const UserRole = {
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN'
};

type User = {
  id: string;
  name: string;
  email: string;
  contactPhone?: string | null;
  role: string;
  status: string;
  verified: boolean;
  businessVerified?: boolean | null;
  createdAt: string;
  lastLogin?: string | null;
};



const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    destructive: 'bg-red-100 text-red-800 border border-red-200',
    outline: 'bg-white text-gray-600 border border-gray-300',
    primary: 'bg-blue-100 text-blue-800 border border-blue-200'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Switch = ({ checked, onCheckedChange, className = '' }) => (
  <button
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    } ${className}`}
    onClick={() => onCheckedChange(!checked)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Select = ({ value, onValueChange, children, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value === 'all' ? 'text-gray-500' : 'text-gray-900'}>
          {value === 'all' ? placeholder : value}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const SelectItem = ({ value, children, onSelect }) => (
  <button
    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg"
    onClick={() => onSelect(value)}
  >
    {children}
  </button>
);

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams();
        if (filters.role !== 'all') query.append('role', filters.role);
        if (filters.status !== 'all') query.append('status', filters.status);
        if (filters.search) query.append('search', filters.search);

        const res = await fetch(`/api/admin/users?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [filters]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         user.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error('Failed to update user status');
      
      setUsers(prev =>
        prev.map(user => (user.id === userId ? { ...user, status } : user))
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      
      if (!res.ok) throw new Error('Failed to update user role');
      
      setUsers(prev =>
        prev.map(user => (user.id === userId ? { ...user, role } : user))
      );
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleVerificationToggle = async (userId: string, verified: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      
      if (!res.ok) throw new Error('Failed to update verification status');
      
      setUsers(prev =>
        prev.map(user => (user.id === userId ? { ...user, verified } : user))
      );
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'BANNED':
        return <Badge variant="destructive">Banned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Shield className="h-4 w-4 text-purple-600" />;
      case UserRole.PROVIDER:
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              User Management
            </h1>
          </div>
          <p className="text-gray-600">Manage users, roles, and verification status</p>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
              />
            </div>

            {/* Role Filter */}
            <div className="relative min-w-[200px]">
              <Select
                value={filters.role}
                onValueChange={(value) => setFilters({ ...filters, role: value })}
                placeholder="Filter by role"
              >
                <SelectItem value="all" onSelect={(value) => setFilters({ ...filters, role: value })}>
                  All Roles
                </SelectItem>
                <SelectItem value={UserRole.CUSTOMER} onSelect={(value) => setFilters({ ...filters, role: value })}>
                  Customers
                </SelectItem>
                <SelectItem value={UserRole.PROVIDER} onSelect={(value) => setFilters({ ...filters, role: value })}>
                  Providers
                </SelectItem>
                <SelectItem value={UserRole.ADMIN} onSelect={(value) => setFilters({ ...filters, role: value })}>
                  Admins
                </SelectItem>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[200px]">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
                placeholder="Filter by status"
              >
                <SelectItem value="all" onSelect={(value) => setFilters({ ...filters, status: value })}>
                  All Statuses
                </SelectItem>
                <SelectItem value="ACTIVE" onSelect={(value) => setFilters({ ...filters, status: value })}>
                  Active
                </SelectItem>
                <SelectItem value="PENDING_REVIEW" onSelect={(value) => setFilters({ ...filters, status: value })}>
                  Pending Review
                </SelectItem>
                <SelectItem value="BANNED" onSelect={(value) => setFilters({ ...filters, status: value })}>
                  Banned
                </SelectItem>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.status === 'ACTIVE').length}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.verified).length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.status === 'PENDING_REVIEW').length}</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-b border-gray-200/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact & Activity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-12 w-12 text-gray-300" />
                        <span className="text-gray-500 font-medium">No users found</span>
                        <span className="text-gray-400 text-sm">Try adjusting your filters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-white/60 transition-all duration-200 group animate-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* User Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              {user.name}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Activity */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-2 text-gray-400" />
                            {user.contactPhone || 'No phone'}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-3 w-3 mr-2 text-gray-400" />
                            {user.lastLogin ? `Last: ${formatTime(user.lastLogin)}` : 'Never logged in'}
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className="font-medium text-gray-700">{user.role}</span>
                          </div>
                          {getStatusBadge(user.status)}
                        </div>
                      </td>

                      {/* Verification */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={user.verified}
                              onCheckedChange={(checked) => handleVerificationToggle(user.id, checked)}
                            />
                            <span className="text-sm text-gray-600">
                              {user.verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                          {user.businessVerified !== null && (
                            <Badge variant={user.businessVerified ? 'primary' : 'outline'} className="text-xs">
                              {user.businessVerified ? 'Business ✓' : 'Business ✗'}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </button>
                          <button className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <span>Showing {filteredUsers.length} of {users.length} users</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}