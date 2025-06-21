'use client';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Listing, Reservation } from "@prisma/client";
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
  MapPin
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

const ActionButton = ({
  onClick,
  variant = 'primary',
  children,
  size = 'sm',
}: {
  onClick: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      onClick={onClick}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-colors`}
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
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      APPROVED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    },
    reservation: {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      APPROVED: { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle2 },
      COMPLETED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
      CANCELLED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    },
  };
  const { bg, text, icon: Icon } = type === "listing" 
    ? configs.listing[status as ListingType["status"]] || configs.listing.PENDING
    : configs.reservation[status as SimplifiedReservation["status"]] || configs.reservation.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

const BookingDashboard = () => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<string>('admin');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [reservations, setReservations] = useState<SimplifiedReservation[]>([]);
  const [loading, setLoading] = useState({
    listings: true,
    reservations: true,
    notifications: true
  });
  const [error, setError] = useState({
    listings: null,
    reservations: null,
    notifications: null
  });
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const role = session?.user?.role;
    if (!session || role !== "ADMIN") {
      router.push("/");
    }
  }, [sessionStatus, session, router]);

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
        const data = await res.json();
        setListings(data);
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
        const data = await res.json();
        setReservations(data);
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
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError(prev => ({ ...prev, notifications: err instanceof Error ? err.message : 'Failed to load notifications' }));
      } finally {
        setLoading(prev => ({ ...prev, notifications: false }));
      }
    };
    
    fetchNotifications();
  }, []);

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
      console.log(`Reservation ${reservationId} updated to ${status}`);
      
      // Update the local state
      setReservations(prev => 
        prev.map(reservation => 
          reservation.id === reservationId 
            ? { ...reservation, status } 
            : reservation
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

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
      setListings(prev =>
        prev.map(listing =>
          listing.id === id ? { ...listing, status: updated.status } : listing
        )
      );
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing status.');
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
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
      setNotifications(prev => prev.filter(notif => notif.id !== id));
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
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.read
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reservations</h3>
          <div className="space-y-4">
            {loading.reservations ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-2 text-gray-600">Loading reservations...</p>
              </div>
            ) : reservations.length > 0 ? (
              // Make sure we're properly mapping through an array
              Array.isArray(reservations) && reservations.slice(0, 5).map(reservation => (
                <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{reservation.listing}</p>
                    <p className="text-sm text-gray-500">{reservation.guest} • {reservation.dates}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${reservation.amount}</p>
                    <StatusBadge status={reservation.status} type="reservation" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-gray-500">
                No reservations found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const ListingsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Listing Management</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Listing</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Owner</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Location</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Price</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading.listings ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="ml-2 text-gray-600">Loading listings...</p>
                    </div>
                  </td>
                </tr>
              ) : listings.length > 0 ? (
                listings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-50">
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
                        <MapPin size={14} />
                        {listing.address}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900">${listing.price}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 justify-end">
                        <ActionButton variant="secondary" onClick={() => {}}>
                          <Eye size={14} className="inline mr-1" />
                          View
                        </ActionButton>
                        {listing.status === 'PENDING' && (
                          <>
                            <ActionButton 
                              variant="success" 
                              onClick={() => handleListingAction(listing.id, 'APPROVED')}
                            >
                              Approve
                            </ActionButton>
                            <ActionButton 
                              variant="danger" 
                              onClick={() => handleListingAction(listing.id, 'REJECTED')}
                            >
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
                  <td colSpan={6} className="py-4 text-center text-gray-500">
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
const ReservationsContent = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
      <div className="flex items-center gap-3">
        <select className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
          <option>All Status</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Completed</option>
          <option>CANCELLED</option>
        </select>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading.reservations ? (
        <div className="col-span-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-2 text-gray-600">Loading reservations...</p>
        </div>
      ) : reservations.length > 0 ? (
        reservations.map(reservation => (
          <div key={reservation.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-medium text-gray-900">{reservation.listing}</p>
                <p className="text-sm text-gray-500">{reservation.dates}</p>
              </div>
              <StatusBadge status={reservation.status} type="reservation" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-gray-900">${reservation.totalPrice}</span>
              <div className="flex items-center gap-1 text-gray-500">
                <CreditCard size={16} />
                <span className="text-sm">Paid</span>
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
                    Confirm
                  </ActionButton>
                  <ActionButton 
                    variant="danger" 
                    size="md"
                    onClick={() => handleReservationAction(reservation.id, 'CANCELLED')}
                  >
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
                  Mark Complete
                </ActionButton>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center p-8 text-gray-500">
          No reservations found
        </div>
      )}
    </div>
  </div>
);


  const NotificationsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilter(f => f === 'all' ? 'unread' : 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {filter === 'all' ? 'Show Unread' : 'Show All'}
          </button>
          <ActionButton variant="secondary" onClick={markAllRead}>Mark All Read</ActionButton>
        </div>
      </div>
      <div className="space-y-4">
        {loading.notifications ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`bg-white rounded-2xl p-6 shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                notification.read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'
              }`}
              onClick={() => markNotificationRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  notification.type === 'booking' ? 'bg-blue-100' : 'bg-yellow-100'
                }`}>
                  {notification.type === 'booking' && <Calendar size={20} className="text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>{notification.message}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id, e);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                </div>
                {!notification.read && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-4 text-gray-500">
            No notifications
          </div>
        )}
      </div>
    </div>
  );

  const Sidebar = () => (
    <div className="w-64 bg-white border-r border-gray-200 p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Home size={20} className="text-white" />
        </div>
        <div>

          <p className="text-sm text-gray-500 capitalize">{userRole} Panel</p>
        </div>
      </div>
      <nav className="space-y-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'listings', label: 'Listings', icon: Home },
          { id: 'reservations', label: 'Reservations', icon: Calendar },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            badge: notifications.filter(n => !n.read).length,
          },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              activeTab === item.id
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon size={20} />
            <span className="flex-1">{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
   
            <p className="text-sm text-gray-500">{userRole}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'listings':
        return <ListingsContent />;
      case 'reservations':
        return <ReservationsContent />;
      case 'notifications':
        return <NotificationsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 capitalize">
                {activeTab === 'dashboard' ? 'Dashboard Overview' : activeTab}
              </h1>
              <p className="text-gray-500 mt-1">
                {activeTab === 'dashboard' && 'Monitor your platform performance and activity'}
                {activeTab === 'listings' && 'Manage and review property listings'}
                {activeTab === 'reservations' && 'Track and manage bookings'}
                {activeTab === 'notifications' && 'Stay updated with latest activities'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default BookingDashboard;
