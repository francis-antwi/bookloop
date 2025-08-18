'use client';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Listing, Reservation, UserRole } from "@prisma/client";
import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Home,
  Calendar,
  Star,
  Settings,
  Filter,
  Search,
  TrendingUp,
  Eye,
  CreditCard,
  MapPin,
  Menu,
  X,
  AlertCircle,
  BarChart3,
  Activity,
  Building2,
  UserCheck,
  ChevronRight,
  Plus,
  Download,
  MoreVertical,
  Shield,
  User as UserIcon,
  UserX
} from 'lucide-react';

type Notification = {
  id: string;
  message: string;
  read: boolean;
  type: 'booking' | 'system';
  time: string;
};

type SimplifiedReservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalPrice: number;
  createdAt: string;
  startDate: string;
  endDate: string;
  amount: number;
  listing: string;
  guest: string;
  dates: string;
};

type ListingType = {
  id: string;
  title: string;
  contactPhone: string;
  address: string;
  price: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type Provider = {
  id: string;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type User = {
  id: string;
  name: string;
  email: string;
  contactPhone?: string | null;
  role: UserRole;
  status: string;
  verified: boolean;
  businessVerified?: boolean | null;
  category?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
};

const ActionButton = ({
  onClick,
  variant = 'primary',
  children,
  size = 'sm',
  disabled = false,
}: {
  onClick: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
      }`}
    >
      {children}
    </button>
  );
};

const StatusBadge = ({
  status,
  type = "listing",
}: {
  status: string;
  type?: "listing" | "reservation";
}) => {
  const configs = {
    listing: {
      PENDING: { bg: "bg-amber-100", text: "text-amber-800", icon: Clock, border: "border-amber-200" },
      APPROVED: { bg: "bg-emerald-100", text: "text-emerald-800", icon: CheckCircle2, border: "border-emerald-200" },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle, border: "border-red-200" },
    },
    reservation: {
      PENDING: { bg: "bg-amber-100", text: "text-amber-800", icon: Clock, border: "border-amber-200" },
      CONFIRMED: { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle2, border: "border-blue-200" },
      COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800", icon: CheckCircle2, border: "border-emerald-200" },
      CANCELLED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle, border: "border-red-200" },
    }
  };
  
  const config = type === "listing" 
    ? configs.listing[status as ListingType["status"]] || configs.listing.PENDING
    : configs.reservation[status as SimplifiedReservation["status"]] || configs.reservation.PENDING;
  
  const { bg, text, icon: Icon, border } = config;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

const StatsCard = ({ title, value, icon: Icon, change, changeType = 'positive' }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change && (
          <p className={`text-sm mt-1 ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon size={24} className="text-blue-600" />
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State for all data
  const [loading, setLoading] = useState({
    listings: true,
    reservations: true,
    notifications: true,
    providers: true,
    users: true
  });
  
  const [error, setError] = useState({
    listings: null,
    reservations: null,
    notifications: null,
    providers: null,
    users: null
  });
  
  const [data, setData] = useState({
    listings: [] as ListingType[],
    reservations: [] as SimplifiedReservation[],
    notifications: [] as Notification[],
    providers: [] as Provider[],
    users: [] as User[]
  });
  
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [userFilters, setUserFilters] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });

  // Add user management functions
  const handleUserStatusChange = async (userId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error('Failed to update user status');
      
      setData(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? { ...user, status } : user
        )
      }));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      
      if (!res.ok) throw new Error('Failed to update user role');
      
      setData(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? { ...user, role } : user
        )
      }));
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
      
      setData(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? { ...user, verified } : user
        )
      }));
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  // Add fetchUsers function
const fetchUsers = async () => {
  try {
    setLoading(prev => ({ ...prev, users: true }));
    setError(prev => ({ ...prev, users: null }));
    
    // Build query parameters
    const params = new URLSearchParams();
    if (userFilters.role !== 'all') params.append('role', userFilters.role);
    if (userFilters.status !== 'all') params.append('status', userFilters.status);
    if (userFilters.search) params.append('search', userFilters.search);

    // Add headers and credentials
    const res = await fetch(`/api/admin/users?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for session cookies
    });

    // Check for errors
    if (!res.ok) {
      let errorMessage = 'Failed to fetch users';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response', e);
      }
      throw new Error(`${errorMessage} (Status: ${res.status})`);
    }

    // Parse successful response
    const users = await res.json();
    setData(prev => ({ ...prev, users }));
  } catch (err) {
    console.error('Failed to load users:', err);
    setError(prev => ({ 
      ...prev, 
      users: err instanceof Error ? err.message : 'Failed to load users' 
    }));
  } finally {
    setLoading(prev => ({ ...prev, users: false }));
  }
};
  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(prev => ({ ...prev, listings: true }));
        setError(prev => ({ ...prev, listings: null }));
        
        const res = await fetch('/api/listings');
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const listings = await res.json();
        setData(prev => ({ ...prev, listings }));
      } catch (err) {
        console.error('Failed to load listings:', err);
        setError(prev => ({ ...prev, listings: err instanceof Error ? err.message : 'Failed to load listings' }));
      } finally {
        setLoading(prev => ({ ...prev, listings: false }));
      }
    };
    
    fetchListings();
  }, []);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(prev => ({ ...prev, reservations: true }));
        setError(prev => ({ ...prev, reservations: null }));
        
        const res = await fetch('/api/reservations/');
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const reservations = await res.json();
        setData(prev => ({ ...prev, reservations }));
      } catch (err) {
        console.error('Failed to load reservations:', err);
        setError(prev => ({ ...prev, reservations: err instanceof Error ? err.message : 'Failed to load reservations' }));
      } finally {
        setLoading(prev => ({ ...prev, reservations: false }));
      }
    };
    
    fetchReservations();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(prev => ({ ...prev, notifications: true }));
        setError(prev => ({ ...prev, notifications: null }));
        
        const res = await fetch('/api/notifications');
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const notifications = await res.json();
        setData(prev => ({ ...prev, notifications }));
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError(prev => ({ ...prev, notifications: err instanceof Error ? err.message : 'Failed to load notifications' }));
      } finally {
        setLoading(prev => ({ ...prev, notifications: false }));
      }
    };
    
    fetchNotifications();
  }, []);

  // Fetch providers
  useEffect(() => {
    const controller = new AbortController();
    const fetchProviders = async () => {
      try {
        setLoading(prev => ({ ...prev, providers: true }));
        setError(prev => ({ ...prev, providers: null }));
        const res = await fetch("/api/admin/providers", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const providers = await res.json();
        setData(prev => ({ ...prev, providers }));
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load providers:", err);
        setError(prev => ({
          ...prev,
          providers: err instanceof Error ? err.message : "Failed to load providers",
        }));
      } finally {
        setLoading(prev => ({ ...prev, providers: false }));
      }
    };
    fetchProviders();
    return () => controller.abort();
  }, []);

  // Initial data loading
  useEffect(() => {
    if (sessionStatus === "loading") return;
    const role = session?.user?.role;
    if (!session || role !== "ADMIN") {
      router.push("/");
    } else {
      fetchUsers();
    }
  }, [sessionStatus, session, router]);

  // Filtered notifications
  const filteredNotifications = data.notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );

  // Filtered users
  const filteredUsers = data.users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      (user.contactPhone && user.contactPhone.toLowerCase().includes(userFilters.search.toLowerCase()));
    
    const matchesStatus = userFilters.status === 'all' ? true : user.status === userFilters.status;
    const matchesRole = userFilters.role === 'all' ? true : user.role === userFilters.role;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Stats calculation
  const stats = {
    totalListings: data.listings.length,
    pendingListings: data.listings.filter(l => l.status === 'PENDING').length,
    totalReservations: data.reservations.length,
    pendingReservations: data.reservations.filter(r => r.status === 'PENDING').length,
    totalRevenue: data.reservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
    pendingProviders: data.providers.filter(p => p.status === 'PENDING').length,
    totalUsers: data.users.length,
    activeUsers: data.users.filter(u => u.status === 'ACTIVE').length,
  };

  // Reservation actions
  const handleReservationAction = async (
    reservationId: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  ) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update reservation');
   
      setData(prev => ({
        ...prev,
        reservations: prev.reservations.map(reservation => 
          reservation.id === reservationId 
            ? { ...reservation, status } 
            : reservation
        )
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Listing actions
  const handleListingAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/listings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update listing');
      }
      const updated = await res.json();
      setData(prev => ({
        ...prev,
        listings: prev.listings.map(listing =>
          listing.id === id ? { ...listing, status: updated.status } : listing
        )
      }));
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing status.');
    }
  };

  // Provider approval
  const handleProviderApproval = async (
    id: string,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    try {
      const res = await fetch(`/api/admin/providers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessVerified: decision === 'APPROVED',
          notes: decision === 'REJECTED' ? 'Your business was not eligible.' : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update provider');
      }
      const updated = await res.json();
      setData(prev => ({
        ...prev,
        providers: prev.providers.map(provider =>
          provider.id === id
            ? {
                ...provider,
                status: updated.businessVerified ? 'APPROVED' : 'REJECTED',
              }
            : provider
        )
      }));
    } catch (error) {
      console.error('Error updating provider:', error);
      alert('Failed to update provider status.');
    }
  };

  // Notification actions
  const markNotificationRead = (id: string) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    }));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(notif => notif.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Dashboard Content
  const DashboardContent = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Listings"
          value={stats.totalListings}
          icon={Home}
          change={`${stats.pendingListings} pending`}
          changeType="neutral"
        />
        <StatsCard
          title="Reservations"
          value={stats.totalReservations}
          icon={Calendar}
          change={`${stats.pendingReservations} pending`}
          changeType="neutral"
        />
        <StatsCard
          title="Total Revenue"
          value={`₵${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          change="+12% from last month"
          changeType="positive"
        />
        <StatsCard
          title="Users"
          value={stats.totalUsers}
          icon={Users}
          change={`${stats.activeUsers} active`}
          changeType="neutral"
        />
      </div>
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Reservations</h3>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('reservations')}
            >
              View All
            </ActionButton>
          </div>
          <div className="space-y-4">
            {loading.reservations ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-2 text-gray-600">Loading reservations...</p>
              </div>
            ) : data.reservations.length > 0 ? (
              data.reservations.slice(0, 5).map(reservation => (
                <div key={reservation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{reservation.listing}</p>
                    <p className="text-sm text-gray-500">{reservation.guest} • {reservation.dates}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₵{reservation.amount}</p>
                    <StatusBadge status={reservation.status} type="reservation" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                No reservations found
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('users')}
            >
              View All
            </ActionButton>
          </div>
          <div className="space-y-4">
            {loading.users ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-2 text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.slice(0, 5).map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {user.role === UserRole.ADMIN ? (
                        <Shield size={16} className="text-purple-500" />
                      ) : user.role === UserRole.PROVIDER ? (
                        <UserCheck size={16} className="text-blue-500" />
                      ) : (
                        <UserIcon size={16} className="text-gray-500" />
                      )}
                      <span className="text-sm text-gray-500">{user.role}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Users Content
  const UsersContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage and review user accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userFilters.search}
              onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <select
            value={userFilters.role}
            onChange={(e) => setUserFilters({...userFilters, role: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Roles</option>
            <option value={UserRole.CUSTOMER}>Customers</option>
            <option value={UserRole.PROVIDER}>Providers</option>
            <option value={UserRole.ADMIN}>Admins</option>
          </select>
          <select
            value={userFilters.status}
            onChange={(e) => setUserFilters({...userFilters, status: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">User</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Role</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Verified</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading.users ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="ml-2 text-gray-600">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : error.users ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center text-red-600">
                      <AlertCircle size={20} className="mr-2" />
                      <p>{error.users}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {user.contactPhone || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        {user.role === UserRole.ADMIN ? (
                          <Shield size={16} className="text-purple-500" />
                        ) : user.role === UserRole.PROVIDER ? (
                          <UserCheck size={16} className="text-blue-500" />
                        ) : (
                          <UserIcon size={16} className="text-gray-500" />
                        )}
                        <span>{user.role}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : user.status === 'PENDING_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock size={12} />
                          Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <UserX size={12} />
                          Banned
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={user.verified}
                          onChange={(e) => handleVerificationToggle(user.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 justify-end">
                        <ActionButton
                          variant="secondary"
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </ActionButton>
                        {user.status !== 'ACTIVE' && (
                          <ActionButton
                            variant="success"
                            onClick={() => handleUserStatusChange(user.id, 'ACTIVE')}
                          >
                            Activate
                          </ActionButton>
                        )}
                        {user.status !== 'BANNED' && (
                          <ActionButton
                            variant="danger"
                            onClick={() => handleUserStatusChange(user.id, 'BANNED')}
                          >
                            Ban
                          </ActionButton>
                        )}
                        {user.role !== UserRole.ADMIN && (
                          <ActionButton
                            variant="primary"
                            onClick={() => handleRoleChange(user.id, UserRole.ADMIN)}
                          >
                            Make Admin
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Listings Content
  const ListingsContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Listing Management</h2>
          <p className="text-gray-600 mt-1">Manage and review property listings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <ActionButton variant="secondary" onClick={() => {}}>
            <Filter size={16} className="mr-2" />
            Filter
          </ActionButton>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Listing</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Location</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Price</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading.listings ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="ml-2 text-gray-600">Loading listings...</p>
                    </div>
                  </td>
                </tr>
              ) : error.listings ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center text-red-600">
                      <AlertCircle size={20} className="mr-2" />
                      <p>{error.listings}</p>
                    </div>
                  </td>
                </tr>
              ) : data.listings.length > 0 ? (
                data.listings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Home size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{listing.title}</p>
                          <p className="text-sm text-gray-500">ID: #{listing.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">{listing.contactPhone}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin size={14} className="text-gray-400" />
                        {listing.address}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900">₵{listing.price}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 justify-end">
                        <ActionButton
                          variant="secondary"
                          onClick={() => router.push(`/listings/${listing.id}`)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </ActionButton>
                        {listing.status === 'PENDING' && (
                          <>
                            <ActionButton 
                              variant="success" 
                              onClick={() => handleListingAction(listing.id, 'APPROVED')}
                            >
                              <CheckCircle2 size={14} className="mr-1" />
                              Approve
                            </ActionButton>
                            <ActionButton 
                              variant="danger" 
                              onClick={() => handleListingAction(listing.id, 'REJECTED')}
                            >
                              <XCircle size={14} className="mr-1" />
                              Reject
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No listings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Reservations Content
  const ReservationsContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
          <p className="text-gray-600 mt-1">Manage booking reservations</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
            <option>All Status</option>
            <option>Pending</option>
            <option>Confirmed</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <ActionButton variant="secondary" onClick={() => {}}>
            <Download size={16} className="mr-2" />
            Export
          </ActionButton>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading.reservations ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-gray-600">Loading reservations...</p>
          </div>
        ) : error.reservations ? (
          <div className="col-span-full flex items-center justify-center py-12 text-red-600">
            <AlertCircle size={20} className="mr-2" />
            <p>{error.reservations}</p>
          </div>
        ) : data.reservations.length > 0 ? (
          data.reservations.map(reservation => (
            <div key={reservation.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reservation.listing}</p>
                  <p className="text-sm text-gray-500 mt-1">{reservation.dates}</p>
                  <p className="text-sm text-gray-500">Guest: {reservation.guest}</p>
                </div>
                <StatusBadge status={reservation.status} type="reservation" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">₵{reservation.totalPrice}</span>
                <div className="flex items-center gap-1 text-gray-500">
                  <CreditCard size={16} />
                  <span className="text-sm">Payment</span>
                </div>
              </div>
              <div className="flex gap-2">
                {reservation.status === 'PENDING' && (
                  <>
                    <ActionButton 
                      variant="success" 
                      size="md"
                      onClick={() => handleReservationAction(reservation.id, 'CONFIRMED')}
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Confirm
                    </ActionButton>
                    <ActionButton 
                      variant="danger" 
                      size="md"
                      onClick={() => handleReservationAction(reservation.id, 'CANCELLED')}
                    >
                      <XCircle size={14} className="mr-1" />
                      Cancel
                    </ActionButton>
                  </>
                )}
                {reservation.status === 'CONFIRMED' && (
                  <ActionButton 
                    variant="success" 
                    size="md"
                    onClick={() => handleReservationAction(reservation.id, 'COMPLETED')}
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    Complete
                  </ActionButton>
                )}
                <ActionButton 
                  variant="secondary" 
                  size="md"
                  onClick={() => router.push(`/reservations/${reservation.id}`)}
                >
                  <Eye size={14} className="mr-1" />
                  View Details
                </ActionButton>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            No reservations found
          </div>
        )}
      </div>
    </div>
  );

  // Providers Content
  const ProvidersContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provider Management</h2>
          <p className="text-gray-600 mt-1">Review and approve service providers</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
          <ActionButton variant="secondary" onClick={() => {}}>
            <Download size={16} className="mr-2" />
            Export
          </ActionButton>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Provider</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Business</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Submitted</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading.providers ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="ml-2 text-gray-600">Loading providers...</p>
                    </div>
                  </td>
                </tr>
              ) : error.providers ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center text-red-600">
                      <AlertCircle size={20} className="mr-2" />
                      <p>{error.providers}</p>
                    </div>
                  </td>
                </tr>
              ) : data.providers.length > 0 ? (
                data.providers.map(provider => (
                  <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <UserCheck size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{provider.name}</p>
                          <p className="text-sm text-gray-500">{provider.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Building2 size={14} className="text-gray-400" />
                        {provider.businessName}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">{provider.phone}</td>
                    <td className="py-4 px-6 text-gray-700">{provider.submittedAt}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={provider.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 justify-end">
                        <ActionButton
                          variant="secondary"
                          onClick={() => router.push(`/admin/verifications/${provider.id}`)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </ActionButton>
                        {provider.status === 'PENDING' && (
                          <>
                            <ActionButton 
                              variant="success" 
                              onClick={() => handleProviderApproval(provider.id, 'APPROVED')}
                            >
                              <CheckCircle2 size={14} className="mr-1" />
                              Approve
                            </ActionButton>
                            <ActionButton 
                              variant="danger" 
                              onClick={() => handleProviderApproval(provider.id, 'REJECTED')}
                            >
                              <XCircle size={14} className="mr-1" />
                              Reject
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No providers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Notifications Content
  const NotificationsContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">Manage system notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
          <ActionButton variant="secondary" onClick={markAllRead}>
            <CheckCircle2 size={16} className="mr-2" />
            Mark All Read
          </ActionButton>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="space-y-0">
          {loading.notifications ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-2 text-gray-600">Loading notifications...</p>
            </div>
          ) : error.notifications ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle size={20} className="mr-2" />
              <p>{error.notifications}</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => !notification.read && markNotificationRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'booking' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {notification.type === 'booking' ? (
                        <Calendar size={16} className="text-blue-600" />
                      ) : (
                        <Bell size={16} className="text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No notifications found
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Settings Content
  const SettingsContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Manage system settings and preferences</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-approve listings</p>
                <p className="text-sm text-gray-500">Automatically approve new listings</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email notifications</p>
                <p className="text-sm text-gray-500">Send email alerts for new bookings</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Rate (%)
              </label>
              <input
                type="number"
                defaultValue="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Booking Amount (₵)
              </label>
              <input
                type="number"
                defaultValue="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <ActionButton variant="primary" onClick={() => {}}>
              Save Settings
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );

  // Sidebar items with Users tab
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'listings', label: 'Listings', icon: Home },
    { id: 'reservations', label: 'Reservations', icon: Calendar },
    { id: 'providers', label: 'Providers', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'users':
        return <UsersContent />;
      case 'listings':
        return <ListingsContent />;
      case 'reservations':
        return <ReservationsContent />;
      case 'providers':
        return <ProvidersContent />;
      case 'notifications':
        return <NotificationsContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.id === 'notifications' && data.notifications.filter(n => !n.read).length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {data.notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeTab === 'dashboard' ? 'Dashboard' : activeTab}
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {session?.user?.name || 'Admin'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell size={20} className="text-gray-600" />
                {data.notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {data.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;