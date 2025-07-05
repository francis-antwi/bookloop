'use client';

import React, { useState, useMemo, useEffect, memo } from "react";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  Tag,
  Clock,
  Users,
  Car,
  Home,
  Building,
  Utensils,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Star as StarIcon,
  StarHalf as StarHalfIcon,
  Heart,
  Share2,
  Eye,
  MessageCircle
} from "lucide-react";

// Create StarOutlineIcon as a simple Star component
const StarOutlineIcon = ({ className }: { className?: string }) => (
  <StarIcon className={`${className} fill-none`} />
);
import { FiFlag, FiMessageSquare } from "react-icons/fi";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReviewForm from "@/app/components/inputs/ReviewForm";

interface Review {
  id: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

interface ListingInfoProps {
  listing?: {
    id: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    category?: string;
    imageSrc?: string[];
    price?: number;
    title?: string;
    description?: string;
    contactPhone?: string;
    email?: string;
    address?: string;

    bedrooms?: number | null;
    bathrooms?: number | null;
    furnished?: boolean;
    floor?: number | null;

    make?: string | null;
    model?: string | null;
    year?: number | null;
    seats?: number | null;
    fuelType?: string | null;

    capacity?: number | null;
    rooms?: number | null;
    hasStage?: boolean;
    parkingAvailable?: boolean;

    cuisineType?: string | null;
    seatingCapacity?: number | null;
    openingHours?: string | null;
    deliveryAvailable?: boolean;
    menuHighlights?: string | null;

    serviceType?: string | null;
    availableDates?: string | null;
    duration?: number | null;
    requiresBooking?: boolean;
    serviceProvider?: string | null;

    user: {
      id: string;
      name?: string;
      image?: string;
    };
    reviews?: Review[];
  };
}

const categorySpecificFields: Record<string, Record<string, { label: string; icon?: React.ReactNode }>> = {
  Apartments: {
    bedrooms: { label: "Bedrooms", icon: <Home className="w-4 h-4"/> },
    bathrooms: { label: "Bathrooms", icon: <Home className="w-4 h-4"/> },
    furnished: { label: "Furnished", icon: <Home className="w-4 h-4"/> },
    floor: { label: "Floor Number", icon: <Building className="w-4 h-4"/> },
  },
  Cars: {
    make: { label: "Make", icon: <Car className="w-4 h-4"/> },
    model: { label: "Model", icon: <Car className="w-4 h-4"/> },
    year: { label: "Year", icon: <Calendar className="w-4 h-4"/> },
    seats: { label: "Seats", icon: <Users className="w-4 h-4"/> },
    fuelType: { label: "Fuel Type", icon: <Settings className="w-4 h-4"/> },
  },
  "Event Centers": {
    capacity: { label: "Capacity", icon: <Users className="w-4 h-4"/> },
    rooms: { label: "Rooms", icon: <Building className="w-4 h-4"/> },
    hasStage: { label: "Has Stage", icon: <Building className="w-4 h-4"/> },
    parkingAvailable: { label: "Parking", icon: <Car className="w-4 h-4"/> },
  },
  Restaurants: {
    cuisineType: { label: "Cuisine", icon: <Utensils className="w-4 h-4"/> },
    seatingCapacity: { label: "Seating Capacity", icon: <Users className="w-4 h-4"/> },
    openingHours: { label: "Opening Hours", icon: <Clock className="w-4 h-4"/> },
    deliveryAvailable: { label: "Delivery Available", icon: <Utensils className="w-4 h-4"/> },
    menuHighlights: { label: "Menu Highlights", icon: <Utensils className="w-4 h-4"/> },
  },
  Appointments: {
    serviceType: { label: "Service Type", icon: <Settings className="w-4 h-4"/> },
    availableDates: { label: "Available Dates", icon: <Calendar className="w-4 h-4"/> },
    duration: { label: "Duration", icon: <Clock className="w-4 h-4"/> },
    requiresBooking: { label: "Requires Booking", icon: <Calendar className="w-4 h-4"/> },
    serviceProvider: { label: "Service Provider", icon: <Users className="w-4 h-4"/> },
  },
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'Apartments': return <Home className="w-5 h-5"/>;
    case 'Cars': return <Car className="w-5 h-5"/>;
    case 'Event Centers': return <Building className="w-5 h-5"/>;
    case 'Restaurants': return <Utensils className="w-5 h-5"/>;
    case 'Appointments': return <Calendar className="w-5 h-5"/>;
    default: return <Tag className="w-5 h-5"/>;
  }
};

const getCategoryGradient = (category?: string) => {
  switch (category) {
    case 'Apartments': return 'from-blue-500 to-purple-600';
    case 'Cars': return 'from-red-500 to-orange-600';
    case 'Event Centers': return 'from-green-500 to-teal-600';
    case 'Restaurants': return 'from-yellow-500 to-pink-600';
    case 'Appointments': return 'from-indigo-500 to-blue-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString('en-US', {
    year: "numeric", month: "short", day: "numeric"
  });
};

const InfoItem = memo(({ icon, label, value, onClick, isClickable = false }: {
  icon: React.ReactNode;
  label: string;
  value: string|number|boolean;
  onClick?: () => void;
  isClickable?: boolean;
}) => (
  <div
    className={`group flex items-start gap-4 p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 transition-all duration-300 ${
      isClickable
        ? "hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 cursor-pointer hover:shadow-lg hover:shadow-blue-100/50 active:scale-95 transform hover:-translate-y-1"
        : "hover:border-gray-200 hover:shadow-md"
    } backdrop-blur-sm`}
    onClick={onClick}
  >
    <div className={`flex-shrink-0 mt-0.5 p-2 rounded-xl transition-all duration-300 ${
      isClickable 
        ? 'text-blue-600 bg-blue-100 group-hover:bg-blue-200 group-hover:scale-110' 
        : 'text-gray-500 bg-gray-100 group-hover:bg-gray-200'
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
      <p className={`text-sm ${isClickable ? 'text-blue-600 font-medium' : 'text-gray-600'} transition-colors`}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-500 fill-current drop-shadow-sm" />);
    else if (rating >= i - 0.5) stars.push(<StarHalfIcon key={i} className="w-4 h-4 text-yellow-500 fill-current drop-shadow-sm" />);
    else stars.push(<StarOutlineIcon key={i} className="w-4 h-4 text-gray-300 drop-shadow-sm" />);
  }
  return <div className="flex gap-0.5">{stars}</div>;
};

const ReviewPagination = ({ reviews, pageSize = 3 }: { reviews: Review[], pageSize?: number }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(reviews.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reviews.slice(start, start + pageSize);
  }, [reviews, page, pageSize]);
  
  return (
    <div className="space-y-6">
      {paginated.map((r, index) => (
        <div 
          key={r.id} 
          className="border-b border-gray-100 pb-6 last:border-b-0 animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              {r.reviewerAvatar ? (
                <Image
                  src={r.reviewerAvatar}
                  alt={r.reviewerName}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-gray-100 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {r.reviewerName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{r.reviewerName}</p>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={r.rating} />
                <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
              </div>
            </div>
          </div>
          {r.comment && (
            <div className="ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-gray-700 text-sm leading-relaxed">{r.comment}</p>
            </div>
          )}
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                i + 1 === page
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 border-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ListingInfo: React.FC<ListingInfoProps> = ({ listing }) => {
  const [selectedImage, setSelectedImage] = useState<string|null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id;

  if (!listing) return null;

  const showMessageButton = listing.user?.id && listing.user.id !== currentUserId;
  const extraFields = listing.category ? categorySpecificFields[listing.category] : null;

  // Calculate average star rating
  const avgRating = useMemo(() => {
    if (!listing.reviews || listing.reviews.length === 0) return 0;
    const sum = listing.reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / listing.reviews.length;
  }, [listing.reviews]);

  return (
    <>
      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }
        
        .glass-effect {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>

      {/* Modal Image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4 backdrop-blur-sm" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-5xl h-[85vh] animate-fade-in">
            <button 
              className="absolute top-4 right-4 text-white z-10 bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all duration-300 hover:scale-110 backdrop-blur-sm" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="w-6 h-6"/>
            </button>
            <Image 
              src={selectedImage} 
              alt="Selected" 
              fill 
              className="object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
          <h1 className="sr-only">{listing.title}</h1>

          {/* Hero Section */}
          <div className="glass-effect rounded-3xl shadow-2xl shadow-gray-900/10 p-8 border border-white/50 animate-slide-up">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${getCategoryGradient(listing.category)} text-white shadow-lg`}>
                    {getCategoryIcon(listing.category)}
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-gray-800">{listing.category || "Uncategorized"}</span>
                    <p className="text-xs text-gray-500">Updated {formatDate(listing.updatedAt)}</p>
                  </div>
                </div>
                
                <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">{listing.title}</h2>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {listing.user.image ? (
                      <Image 
                        src={listing.user.image} 
                        alt={listing.user.name || "User"} 
                        width={56} 
                        height={56} 
                        className="rounded-full object-cover border-3 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {listing.user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.user.name || "User"}</p>
                    <p className="text-sm text-gray-500">Service Provider</p>
                  </div>
                </div>
              </div>
              
              <div className="text-right lg:text-left">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
                  <p className="text-4xl font-bold mb-2">GH₵ {listing.price?.toLocaleString()}</p>
                  {avgRating > 0 && (
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                      <StarRating rating={avgRating}/>
                      <span className="text-sm text-yellow-100">({listing.reviews?.length || 0} reviews)</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-4 justify-center lg:justify-start">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`p-3 rounded-full transition-all duration-300 ${
                      isLiked 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                        : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-500 shadow-md'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-3 rounded-full bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-500 shadow-md transition-all duration-300">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="glass-effect rounded-3xl shadow-xl p-8 border border-white/50 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Description</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">{listing.description}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="glass-effect rounded-3xl shadow-xl p-8 border border-white/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl text-white">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Contact & Actions</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listing.contactPhone && (
                <InfoItem 
                  icon={<Phone className="w-5 h-5"/>} 
                  label="Phone" 
                  value={listing.contactPhone} 
                  isClickable 
                  onClick={() => window.open(`tel:${listing.contactPhone}`, "_self")}
                />
              )}
              {listing.email && (
                <InfoItem 
                  icon={<Mail className="w-5 h-5"/>} 
                  label="Email" 
                  value={listing.email} 
                  isClickable 
                  onClick={() => window.open(`mailto:${listing.email}`, "_self")}
                />
              )}
              {listing.address && (
                <InfoItem 
                  icon={<MapPin className="w-5 h-5"/>} 
                  label="Address" 
                  value={listing.address} 
                  isClickable 
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(listing.address!)}`, "_blank")}
                />
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {showMessageButton && (
                <Link 
                  href={`/chat/${listing.user.id}`} 
                  className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl hover:from-blue-700 hover:to-purple-700 text-sm font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105"
                >
                  <FiMessageSquare className="w-5 h-5"/> Message Provider
                </Link>
              )}
              <Link 
                href={`/report/listing/${listing.id}`} 
                className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-2xl hover:from-red-600 hover:to-pink-700 text-sm font-medium transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-105"
              >
                <FiFlag className="w-5 h-5"/> Report Listing
              </Link>
            </div>
          </div>

          {/* Category Details */}
          {extraFields && (
            <div className="glass-effect rounded-3xl shadow-xl p-8 border border-white/50 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 bg-gradient-to-br ${getCategoryGradient(listing.category)} rounded-xl text-white`}>
                  {getCategoryIcon(listing.category)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{listing.category} Details</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(extraFields).map(([field, {label, icon}]) => {
                  const val = (listing as any)[field];
                  return val !== null && val !== undefined ? (
                    <InfoItem key={field} icon={icon!} label={label} value={val}/>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Review Submission */}
          <div className="glass-effect rounded-3xl shadow-xl p-8 border border-white/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl text-white">
                <StarIcon className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Leave a Review</h3>
            </div>
            {listing.id && <ReviewForm listingId={listing.id}/>}
          </div>

          {/* Reviews Display */}
          {listing.reviews && listing.reviews.length > 0 && (
            <div className="glass-effect rounded-3xl shadow-xl p-8 border border-white/50 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Reviews ({listing.reviews.length})</h3>
              </div>
              <ReviewPagination reviews={listing.reviews} />
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-center items-center text-gray-500 mt-12 animate-fade-in">
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/50">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Listed on {formatDate(listing.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Sticky Mobile Actions */}
        <div className="fixed bottom-0 left-0 right-0 glass-effect border-t border-white/50 p-4 sm:hidden shadow-2xl">
          <div className="flex gap-3">
            {listing.contactPhone && (
              <button 
                onClick={() => window.open(`tel:${listing.contactPhone}`, "_self")} 
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-green-500/25 transform active:scale-95"
              >
                <Phone className="w-5 h-5" />
                Call Now
              </button>
            )}
            {listing.email && (
              <button 
                onClick={() => window.open(`mailto:${listing.email}`, '_self')} 
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 px-4 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 transform active:scale-95"
              >
                <Mail className="w-5 h-5" />
                Email
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ListingInfo;