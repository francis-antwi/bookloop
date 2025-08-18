'use client';

import { UserRole, ServiceCategory } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FiArrowLeft, FiSave, FiUser, FiMail, FiPhone, 
  FiCheckCircle, FiShield, FiBriefcase, FiFileText 
} from 'react-icons/fi';

interface UserData {
  id: string;
  name: string;
  email: string;
  contactPhone: string | null;
  role: UserRole;
  status: string;
  verified: boolean;
  businessVerified: boolean;
  category: ServiceCategory | null;
  createdAt: Date;
  updatedAt: Date;
  isOtpVerified: boolean;
  isFaceVerified: boolean;
  trustScore: number | null;
  requiresApproval: boolean;
  businessVerification?: {
    id: string;
    tinNumber: string;
    registrationNumber: string;
    businessName: string;
    businessType: ServiceCategory[];
    allowedCategories: ServiceCategory[];
    verified: boolean;
  };
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

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    role: UserRole.CUSTOMER,
    verified: false,
    businessVerified: false,
    categories: [] as ServiceCategory[],
  });
  const [businessForm, setBusinessForm] = useState({
    verified: false,
    allowedCategories: [] as ServiceCategory[],
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
        setFormData({
          status: data.status || '',
          role: data.role || UserRole.CUSTOMER,
          verified: data.verified || false,
          businessVerified: data.businessVerified || false,
          categories: data.categories || [],
        });
        if (data.businessVerification) {
          setBusinessForm({
            verified: data.businessVerification.verified || false,
            allowedCategories: data.businessVerification.allowedCategories || [],
          });
        }
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

  const handleCategoryToggle = (category: ServiceCategory) => {
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      
      return {
        ...prev,
        categories: newCategories,
      };
    });
  };

  const handleBusinessToggle = (category: ServiceCategory) => {
    setBusinessForm(prev => {
      const newCategories = prev.allowedCategories.includes(category)
        ? prev.allowedCategories.filter(c => c !== category)
        : [...prev.allowedCategories, category];
      
      return {
        ...prev,
        allowedCategories: newCategories,
      };
    });
  };

  const handleSave = async () => {
    try {
      // Update user basic info
      const userResponse = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!userResponse.ok) throw new Error('Failed to update user');

      // Update business verification if exists
      if (user?.businessVerification) {
        const businessResponse = await fetch(`/api/admin/business-info/${user.businessVerification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verified: businessForm.verified,
            allowedCategories: businessForm.allowedCategories,
          }),
        });

        if (!businessResponse.ok) throw new Error('Failed to update business verification');
      }

      const updatedUser = await userResponse.json();
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
        <button onClick={() => router.back()} className="btn btn-primary">
          <FiArrowLeft className="mr-2" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <button onClick={() => router.back()} className="btn btn-ghost mr-4">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1 bg-base-100 rounded-lg shadow p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="avatar placeholder mb-4">
              <div className="bg-neutral text-neutral-content rounded-full w-24 h-24">
                <span className="text-3xl">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{user.name || 'Unknown User'}</h2>
            <p className="text-sm text-gray-500">User ID: {user.id}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <FiMail className="mr-2 text-gray-500" />
              <span>{user.email || 'No email'}</span>
            </div>
            {user.contactPhone && (
              <div className="flex items-center">
                <FiPhone className="mr-2 text-gray-500" />
                <span>{user.contactPhone}</span>
              </div>
            )}
            <div className="flex items-center">
              <FiShield className="mr-2 text-gray-500" />
              <span className="capitalize">{user.role?.toLowerCase() || 'No role'}</span>
            </div>
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 text-gray-500" />
              <span>Email {user.verified ? 'Verified' : 'Not Verified'}</span>
            </div>
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 text-gray-500" />
              <span>OTP {user.isOtpVerified ? 'Verified' : 'Not Verified'}</span>
            </div>
            <div className="flex items-center">
              <FiCheckCircle className="mr-2 text-gray-500" />
              <span>Face {user.isFaceVerified ? 'Verified' : 'Not Verified'}</span>
            </div>
            {user.category && (
              <div className="flex items-center">
                <FiUser className="mr-2 text-gray-500" />
                <span className="capitalize">{user.category.toLowerCase().replace('_', ' ')}</span>
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
          {/* Account Status Card */}
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
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="BANNED">Banned</option>
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
                    <option value={UserRole.CUSTOMER}>Customer</option>
                    <option value={UserRole.PROVIDER}>Provider</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Categories</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(ServiceCategory).map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryToggle(category)}
                        className={`badge ${formData.categories.includes(category) 
                          ? 'badge-primary' 
                          : 'badge-outline'} cursor-pointer hover:scale-105 transition-transform`}
                      >
                        {category?.toLowerCase().replace('_', ' ') || 'Unknown'}
                      </button>
                    ))}
                  </div>
                  {formData.categories.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">No categories selected</p>
                  )}
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Email Verified</span>
                    <input
                      type="checkbox"
                      name="verified"
                      checked={formData.verified}
                      onChange={handleInputChange}
                      className="toggle toggle-primary"
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Business Verified</span>
                    <input
                      type="checkbox"
                      name="businessVerified"
                      checked={formData.businessVerified}
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
                  <p className="capitalize">{user.status?.toLowerCase() || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="capitalize">{user.role?.toLowerCase() || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="capitalize">
                    {user.category ? user.category.toLowerCase().replace('_', ' ') : 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Verified</p>
                  <p className="capitalize">{user.verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Verified</p>
                  <p className="capitalize">{user.businessVerified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Business Verification Section */}
          {user.businessVerification && (
            <div className="bg-base-100 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FiBriefcase className="mr-2" /> Business Verification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Business Name</p>
                  <p>{user.businessVerification.businessName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">TIN Number</p>
                  <p>{user.businessVerification.tinNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registration Number</p>
                  <p>{user.businessVerification.registrationNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verification Status</p>
                  <p className="capitalize">
                    {user.businessVerification.verified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Business Types</h3>
                <div className="flex flex-wrap gap-2">
                  {user.businessVerification.businessType?.map(type => (
                    <span key={type} className="badge badge-primary">
                      {type?.toLowerCase().replace('_', ' ') || 'Unknown'}
                    </span>
                  )) || <span className="text-gray-500">No business types</span>}
                </div>
              </div>

              {editing && (
                <div>
                  <h3 className="font-medium mb-2">Allowed Service Categories</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.values(ServiceCategory).map(category => (
                      <button
                        key={category}
                        onClick={() => handleBusinessToggle(category)}
                        className={`badge ${businessForm.allowedCategories.includes(category) 
                          ? 'badge-primary' 
                          : 'badge-outline'}`}
                      >
                        {category?.toLowerCase().replace('_', ' ') || 'Unknown'}
                      </button>
                    ))}
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Verify Business</span>
                      <input
                        type="checkbox"
                        checked={businessForm.verified}
                        onChange={() => setBusinessForm(prev => ({
                          ...prev,
                          verified: !prev.verified
                        }))}
                        className="toggle toggle-primary"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Activity Section */}
          <div className="bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">User Activity</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Recent Listings ({user.listings?.length || 0})</h3>
                {user.listings && user.listings.length > 0 ? (
                  <div className="space-y-2">
                    {user.listings.map(listing => (
                      <div key={listing.id} className="p-3 border rounded-lg">
                        <p className="font-medium">{listing.title || 'Untitled'}</p>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span className="capitalize">{listing.status?.toLowerCase() || 'Unknown'}</span>
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
                {user.reservations && user.reservations.length > 0 ? (
                  <div className="space-y-2">
                    {user.reservations.map(reservation => (
                      <div key={reservation.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">${reservation.totalPrice?.toFixed(2) || '0.00'}</span>
                          <span className="text-sm capitalize">
                            {reservation.status?.toLowerCase() || 'Unknown'}
                          </span>
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