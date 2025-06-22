import React, { useState } from "react";
import { Calendar, MapPin, Phone, Mail, Tag, Clock, Users, Car, Home, Building, Utensils, Settings, X, Star, Heart, Share2, Eye } from "lucide-react";

interface ListingInfoProps {
  listing?: {
    createdAt?: string | null;
    updatedAt?: string | null;
    category?: string;
    imageSrc?: string[]; // or string if one image
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
  };
}

const categorySpecificFields: Record<string, Record<string, { label: string; icon?: React.ReactNode }>> = {
  Apartments: {
    bedrooms: { label: "Bedrooms", icon: <Home className="w-4 h-4" /> },
    bathrooms: { label: "Bathrooms", icon: <Home className="w-4 h-4" /> },
    furnished: { label: "Furnished", icon: <Home className="w-4 h-4" /> },
    floor: { label: "Floor Number", icon: <Building className="w-4 h-4" /> },
  },
  Cars: {
    make: { label: "Make", icon: <Car className="w-4 h-4" /> },
    model: { label: "Model", icon: <Car className="w-4 h-4" /> },
    year: { label: "Year", icon: <Calendar className="w-4 h-4" /> },
    seats: { label: "Number of Seats", icon: <Users className="w-4 h-4" /> },
    fuelType: { label: "Fuel Type", icon: <Settings className="w-4 h-4" /> },
  },
  "Event Centers": {
    capacity: { label: "Capacity", icon: <Users className="w-4 h-4" /> },
    rooms: { label: "Number of Rooms", icon: <Building className="w-4 h-4" /> },
    hasStage: { label: "Has Stage", icon: <Building className="w-4 h-4" /> },
    parkingAvailable: { label: "Parking Available", icon: <Car className="w-4 h-4" /> },
  },
  Restaurants: {
    cuisineType: { label: "Cuisine Type", icon: <Utensils className="w-4 h-4" /> },
    seatingCapacity: { label: "Seating Capacity", icon: <Users className="w-4 h-4" /> },
    openingHours: { label: "Opening Hours", icon: <Clock className="w-4 h-4" /> },
    deliveryAvailable: { label: "Delivery Available", icon: <Utensils className="w-4 h-4" /> },
    menuHighlights: { label: "Menu Highlights", icon: <Utensils className="w-4 h-4" /> },
  },
  Appointments: {
    serviceType: { label: "Service Type", icon: <Settings className="w-4 h-4" /> },
    availableDates: { label: "Available Dates", icon: <Calendar className="w-4 h-4" /> },
    duration: { label: "Duration (mins)", icon: <Clock className="w-4 h-4" /> },
    requiresBooking: { label: "Requires Booking", icon: <Calendar className="w-4 h-4" /> },
    serviceProvider: { label: "Service Provider", icon: <Users className="w-4 h-4" /> },
  },
};

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'Apartments': return <Home className="w-5 h-5" />;
    case 'Cars': return <Car className="w-5 h-5" />;
    case 'Event Centers': return <Building className="w-5 h-5" />;
    case 'Restaurants': return <Utensils className="w-5 h-5" />;
    case 'Appointments': return <Calendar className="w-5 h-5" />;
    default: return <Tag className="w-5 h-5" />;
  }
};

const getCategoryColors = (category?: string) => {
  switch (category) {
    case 'Apartments': return { 
      bg: 'from-emerald-500 to-teal-600', 
      accent: 'emerald',
      shadow: 'shadow-emerald-500/20'
    };
    case 'Cars': return { 
      bg: 'from-blue-500 to-indigo-600', 
      accent: 'blue',
      shadow: 'shadow-blue-500/20'
    };
    case 'Event Centers': return { 
      bg: 'from-purple-500 to-pink-600', 
      accent: 'purple',
      shadow: 'shadow-purple-500/20'
    };
    case 'Restaurants': return { 
      bg: 'from-orange-500 to-red-600', 
      accent: 'orange',
      shadow: 'shadow-orange-500/20'
    };
    case 'Appointments': return { 
      bg: 'from-cyan-500 to-blue-600', 
      accent: 'cyan',
      shadow: 'shadow-cyan-500/20'
    };
    default: return { 
      bg: 'from-gray-500 to-slate-600', 
      accent: 'gray',
      shadow: 'shadow-gray-500/20'
    };
  }
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return "Contact for price";
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const InfoItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string | number | boolean;
  onClick?: () => void;
  isClickable?: boolean;
  accent?: string;
}> = ({ icon, label, value, onClick, isClickable, accent = 'blue' }) => (
  <div 
    className={`group relative overflow-hidden bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
      isClickable 
        ? `cursor-pointer hover:border-${accent}-200 hover:shadow-${accent}-500/10` 
        : 'hover:border-gray-200'
    }`}
    onClick={onClick}
  >
    {/* Gradient overlay on hover */}
    <div className={`absolute inset-0 bg-gradient-to-br from-${accent}-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    
    <div className="relative flex items-center gap-3">
      <div className={`flex-shrink-0 p-2 rounded-lg bg-${accent}-50 text-${accent}-600 group-hover:bg-${accent}-100 transition-colors duration-300`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        <p className={`text-base font-semibold truncate ${isClickable ? `text-${accent}-700` : 'text-gray-900'}`}>
          {value.toString()}
        </p>
      </div>
      {isClickable && (
        <div className={`text-${accent}-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      )}
    </div>
  </div>
);

const ActionButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ icon, label, onClick, variant = 'secondary' }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
      variant === 'primary' 
        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25' 
        : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const ListingInfo: React.FC<ListingInfoProps> = ({ listing }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No listing data available</h3>
          <p className="text-gray-500">Please provide listing information to display.</p>
        </div>
      </div>
    );
  }

  const extraFields = listing.category ? categorySpecificFields[listing.category] : null;
  const categoryColors = getCategoryColors(listing.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-full animate-in zoom-in-95 duration-300">
            <button
              className="absolute -top-16 right-0 text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden ${categoryColors.shadow}`}>
          {/* Enhanced Header Section */}
          <div className={`bg-gradient-to-r ${categoryColors.bg} text-white relative overflow-hidden`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
                backgroundSize: '30px 30px'
              }} />
            </div>
            
            <div className="relative p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      {getCategoryIcon(listing.category)}
                    </div>
                    <span className="text-lg font-medium opacity-90">{listing.category || "Uncategorized"}</span>
                  </div>
                  <h1 className="text-4xl font-bold mb-4 leading-tight">{listing.title || "Untitled Listing"}</h1>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      icon={<Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />}
                      label={isFavorite ? "Favorited" : "Favorite"}
                      onClick={() => setIsFavorite(!isFavorite)}
                      variant="secondary"
                    />
                    <ActionButton
                      icon={<Share2 className="w-4 h-4" />}
                      label="Share"
                      onClick={() => navigator.share?.({ title: listing.title, url: window.location.href })}
                      variant="secondary"
                    />
                    <ActionButton
                      icon={<Eye className="w-4 h-4" />}
                      label="View Details"
                      onClick={() => {}}
                      variant="secondary"
                    />
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                    <div className="text-4xl font-bold mb-2">
                      {listing.price ? formatPrice(listing.price) : "Contact for price"}
                    </div>
                    <div className="text-white/80 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Updated {formatDate(listing.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Wave bottom */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 120" className="w-full h-8 text-white">
                <path fill="currentColor" d="M0,64L1440,32L1440,120L0,120Z"></path>
              </svg>
            </div>
          </div>

          {/* Description Section */}
          {listing.description && (
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className={`p-2 bg-${categoryColors.accent}-50 rounded-lg`}>
                  <Tag className={`w-5 h-5 text-${categoryColors.accent}-600`} />
                </div>
                Description
              </h2>
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100">
                <p className="text-gray-700 leading-relaxed text-lg">{listing.description}</p>
              </div>
            </div>
          )}

          {/* Enhanced Contact Information */}
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className={`p-2 bg-${categoryColors.accent}-50 rounded-lg`}>
                <Phone className={`w-5 h-5 text-${categoryColors.accent}-600`} />
              </div>
              Contact Information
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {listing.contactPhone && (
                <InfoItem
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone Number"
                  value={listing.contactPhone}
                  isClickable={true}
                  accent={categoryColors.accent}
                  onClick={() => window.open(`tel:${listing.contactPhone}`, '_self')}
                />
              )}
              {listing.email && (
                <InfoItem
                  icon={<Mail className="w-5 h-5" />}
                  label="Email Address"
                  value={listing.email}
                  isClickable={true}
                  accent={categoryColors.accent}
                  onClick={() => window.open(`mailto:${listing.email}`, '_self')}
                />
              )}
              {listing.address && (
                <InfoItem
                  icon={<MapPin className="w-5 h-5" />}
                  label="Location"
                  value={listing.address}
                  isClickable={true}
                  accent={categoryColors.accent}
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(listing.address)}`, '_blank')}
                />
              )}
            </div>
          </div>

          {/* Enhanced Category-specific Details */}
          {extraFields && (
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className={`p-2 bg-${categoryColors.accent}-50 rounded-lg`}>
                  {getCategoryIcon(listing.category)}
                </div>
                {listing.category} Details
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(extraFields).map(([fieldName, { label, icon }]) => {
                  const value = (listing as any)[fieldName];

                  if (
                    value === null ||
                    value === undefined ||
                    value === false ||
                    value === "" ||
                    value === 0
                  ) {
                    return null;
                  }

                  return (
                    <InfoItem
                      key={fieldName}
                      icon={icon || <Tag className="w-5 h-5" />}
                      label={label}
                      value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                      accent={categoryColors.accent}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Footer */}
          <div className="p-8 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <div className={`p-2 bg-${categoryColors.accent}-50 rounded-lg`}>
                    <Calendar className={`w-4 h-4 text-${categoryColors.accent}-600`} />
                  </div>
                  <span className="text-sm font-medium">
                    Listed on {formatDate(listing.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-500">Active listing</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-600">Premium listing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingInfo;