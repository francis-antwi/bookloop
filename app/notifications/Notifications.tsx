'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Check, Bell, X, Settings, Archive } from 'lucide-react';
export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth";
type Notification = {
  id: string;
  message: string;
  read: boolean;
  type: 'booking' | 'system';
  time: string;
};

const ActionButton = ({
  onClick,
  variant = 'primary',
  children,
  size = 'sm',
  className = '',
}: {
  onClick: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md',
    ghost: 'bg-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
  };
  return (
    <button
      onClick={onClick}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
};

const NotificationIcon = ({ type, priority }: { type: string; priority: string }) => {
  const getIcon = () => {
    switch (type) {
      case 'booking':
        return <Calendar size={20} />;
      case 'listing':
        return <Bell size={20} />;
      default:
        return <Bell size={20} />;
    }
  };
  const getColor = () => {
    if (priority === 'high') return 'text-red-600 bg-red-100';
    if (priority === 'medium') return 'text-amber-600 bg-amber-100';
    switch (type) {
      case 'booking':
        return 'text-blue-600 bg-blue-100';
      case 'listing':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };
  return (
    <div className={`p-3 rounded-full ${getColor()} transition-colors duration-200`}>
      {getIcon()}
    </div>
  );
};

const NotificationsContent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/notifications');
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell size={32} className="text-gray-700" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-gray-600 mt-1">Stay updated with your latest activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ActionButton
                variant="secondary"
                onClick={markAllRead}
                className="flex items-center gap-2"
                disabled={unreadCount === 0}
              >
                <Check size={16} />
                Mark All Read
              </ActionButton>
            </div>
          </div>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === 'unread' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Unread ({unreadCount > 99 ? "99+" : unreadCount}
)
            </button>
          </div>
        </div>
        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 absolute top-0"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading your notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`group relative bg-white rounded-2xl shadow-sm border transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
                  notification.read
                    ? 'border-gray-100 hover:border-gray-200'
                    : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'
                }`}
                style={{
                  '--animation-delay': `${index * 100}ms`
                }}
                onClick={() => markNotificationRead(notification.id)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className={`font-medium leading-relaxed ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.message}
                        </p>
                        {/* Delete button */}
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-all duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-gray-500 font-medium">
                          {notification.time}
                        </p>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'You have no unread notifications.' 
                  : 'New notifications will appear here when you receive them.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        div[style*="--animation-delay"] {
          animation: slideInUp 0.5s ease-out forwards;
          animation-delay: var(--animation-delay);
        }
      `}</style>
    </div>
  );
};

export default NotificationsContent;