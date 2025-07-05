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
  StarHalf as StarHalfIcon
} from "lucide-react";

// Create StarOutlineIcon as a simple Star component
const StarOutlineIcon = ({ className }: { className?: string }) => (
  <StarIcon className={className} />
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
    className={`flex items-start gap-3 p-4 bg-white rounded-xl border transition-all duration-200 ${
      isClickable
        ? "hover:bg-blue-50 hover:border-blue-200 border-gray-200 cursor-pointer hover:shadow-md active:scale-95"
        : "border-gray-100 hover:border-gray-200"
    }`}
    onClick={onClick}
  >
    <div className={`flex-shrink-0 mt-0.5 ${isClickable ? 'text-blue-600' : 'text-gray-500'}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className={`text-sm mt-1 ${isClickable ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-500" />);
    else if (rating >= i - 0.5) stars.push(<StarHalfIcon key={i} className="w-4 h-4 text-yellow-500" />);
    else stars.push(<StarOutlineIcon key={i} className="w-4 h-4 text-yellow-500" />);
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
      {paginated.map((r) => (
        <div key={r.id} className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            {r.reviewerAvatar && (
              <Image
                src={r.reviewerAvatar}
                alt={r.reviewerName}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{r.reviewerName}</p>
              <StarRating rating={r.rating} />
            </div>
          </div>
          {r.comment && <p className="mt-2 text-gray-700 text-sm">{r.comment}</p>}
          <p className="mt-1 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors ${
                i + 1 === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
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
      {/* Modal Image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-4xl h-[80vh]">
            <button 
              className="absolute top-4 right-4 text-white z-10 bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors" 
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
              className="object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="sr-only">{listing.title}</h1>

          {/* Title / Provider / Price */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600">
                  {getCategoryIcon(listing.category)}
                  <span className="text-base font-medium">{listing.category || "Uncategorized"}</span>
                </div>
                <h2 className="text-2xl font-bold mt-1">{listing.title}</h2>
                <p className="text-xs text-gray-400">Updated {formatDate(listing.updatedAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-yellow-500">GH₵ {listing.price}</p>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating rating={avgRating}/>
                    <span className="text-sm text-gray-600">({listing.reviews?.length || 0})</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              {listing.user.image && (
                <Image 
                  src={listing.user.image} 
                  alt={listing.user.name || "User"} 
                  width={40} 
                  height={40} 
                  className="rounded-full object-cover"
                />
              )}
              <span className="font-medium">{listing.user.name || "User"}</span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-sm text-gray-700">{listing.description}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Contact & Actions</h3>
            <div className="space-y-4">
              {listing.contactPhone && (
                <InfoItem 
                  icon={<Phone className="w-4 h-4"/>} 
                  label="Phone" 
                  value={listing.contactPhone} 
                  isClickable 
                  onClick={() => window.open(`tel:${listing.contactPhone}`, "_self")}
                />
              )}
              {listing.email && (
                <InfoItem 
                  icon={<Mail className="w-4 h-4"/>} 
                  label="Email" 
                  value={listing.email} 
                  isClickable 
                  onClick={() => window.open(`mailto:${listing.email}`, "_self")}
                />
              )}
              {listing.address && (
                <InfoItem 
                  icon={<MapPin className="w-4 h-4"/>} 
                  label="Address" 
                  value={listing.address} 
                  isClickable 
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(listing.address!)}`, "_blank")}
                />
              )}
            </div>

            <div className="pt-4 flex gap-3">
              {showMessageButton && (
                <Link 
                  href={`/chat/${listing.user.id}`} 
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
                >
                  <FiMessageSquare className="w-4 h-4"/> Message Provider
                </Link>
              )}
              
            </div>
          </div>

          {/* Category Details */}
          {extraFields && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">{listing.category} Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
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
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
            {listing.id && <ReviewForm listingId={listing.id}/>}
          </div>

          {/* Reviews Display */}
          {listing.reviews && listing.reviews.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Reviews ({listing.reviews.length})</h3>
              <ReviewPagination reviews={listing.reviews} />
            </div>
          )}

          {/* Footer date */}
          <div className="flex justify-center items-center text-xs text-gray-500 mt-6">
            <Calendar className="w-4 h-4 mr-1"/> Listed on {formatDate(listing.createdAt)}
          </div>
        </div>

        {/* Sticky mobile call/email */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 sm:hidden">
          <div className="flex gap-3">
            {listing.contactPhone && (
              <button 
                onClick={() => window.open(`tel:${listing.contactPhone}`, "_self")} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call
              </button>
            )}
            {listing.email && (
              <button 
                onClick={() => window.open(`mailto:${listing.email}`, '_self')} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
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