'use client';

import { UserRole } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiUser, FiMail, FiPhone, FiCheckCircle, FiShield } from 'react-icons/fi';

interface UserDetails {
  id: string;
  name: string | null;
  email: string;
  contactPhone: string | null;
  role: UserRole;
  status: string;
  verified: boolean;
  businessVerified: boolean;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  listings?: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
  reservations?: Array<{
    id: string;
    status: string;
    totalPrice: number;
    createdAt: Date;
  }>;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    role: UserRole.USER,
    verified: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await response.json();
        setUser(data);
        setFormData({
          status: data.status,
          role: data.role,
          verified: data.verified,
        });
      } catch (error) {
        toast.error('Failed to load user data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditing(false);
      toast.success('User updated successfully');
    } catch (error) {
      toast.error('Failed to update user');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <button
          onClick={() => router.back()}
          className="btn btn-primary"
        >
          <FiArrowLeft className="mr-2" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost mr-4"
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1 bg-base-100 rounded-lg shadow p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="avatar placeholder mb-4">
              <div className="bg-neutral text-neutral-content rounded-full w-24 h-24">
                <span className="text-3xl">
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{user.name || 'No name provided'}</h2>
            <p className="text-sm text-gray-500">User ID: {user.id}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <FiMail className="mr-2 text-gray-500" />
              <span>{user.email}</span>
            </div>
            {user.contactPhone && (
              <div className="flex items-center">
                <FiPhone className="mr-2 text-gray-500" />
                <span>{user.contactPhone}</span>
              </div>
            )}
            <div className="flex items-center">
              <FiShield className="mr-2 text-gray-500" />
              <span className="capitalize">{user.role.toLowerCase()}</span>
            </div>
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 text-gray-500" />
              <span className="capitalize">
                {user.verified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            {user.category && (
              <div className="flex items-center">
                <FiUser className="mr-2 text-gray-500" />
                <span className="capitalize">{user.category}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              <span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              <span className="font-medium">Last Updated:</span> {new Date(user.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Edit Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-base-100 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Status</h2>
              {editing ? (
                <div className="space-x-2">
                  <button onClick={() => setEditing(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="btn btn-primary">
                    <FiSave className="mr-2" /> Save Changes
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="btn btn-outline">
                  Edit User
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="select select-bordered w-full"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Role</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="select select-bordered w-full"
                  >
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Verified</span>
                    <input
                      type="checkbox"
                      name="verified"
                      checked={formData.verified}
                      onChange={handleInputChange}
                      className="toggle toggle-primary"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="capitalize">{user.status.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="capitalize">{user.role.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verified</p>
                  <p className="capitalize">{user.verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Verified</p>
                  <p className="capitalize">{user.businessVerified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </div>

          {/* User Activity */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Recent Listings ({user.listings?.length || 0})</h3>
                {user.listings && user.listings.length > 0 ? (
                  <div className="space-y-2">
                    {user.listings.map(listing => (
                      <div key={listing.id} className="p-3 border rounded-lg">
                        <p className="font-medium">{listing.title}</p>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span className="capitalize">{listing.status.toLowerCase()}</span>
                          <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No listings found</p>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Recent Reservations ({user.reservations?.length || 0})</h3>
                {user.reservations && user.resations.length > 0 ? (
                  <div className="space-y-2">
                    {user.reservations.map(reservation => (
                      <div key={reservation.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">${reservation.totalPrice.toFixed(2)}</span>
                          <span className="text-sm capitalize">{reservation.status.toLowerCase()}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(reservation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No reservations found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}