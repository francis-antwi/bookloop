import React, { useState } from "react";
import { Calendar, MapPin, Phone, Mail, Tag, Clock, Users, Car, Home, Building, Utensils, Settings, X } from "lucide-react";

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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
}> = ({ icon, label, value, onClick, isClickable }) => (
  <div 
    className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-colors ${
      isClickable 
        ? 'hover:bg-blue-50 hover:border-blue-200 border border-transparent cursor-pointer' 
        : 'hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    <div className={`flex-shrink-0 ${isClickable ? 'text-blue-600' : 'text-gray-600'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className={`text-sm truncate ${isClickable ? 'text-blue-600' : 'text-gray-600'}`}>
        {value.toString()}
      </p>
    </div>
    {isClickable && (
      <div className="text-blue-600 opacity-50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    )}
  </div>
);

const ListingInfo: React.FC<ListingInfoProps> = ({ listing }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (!listing) {
    return (
      <div>
        </div>
     
    );
  }

  const extraFields = listing.category ? categorySpecificFields[listing.category] : null;

  return (
    <>
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{listing.title || "Untitled Listing"}</h1>
              <div className="flex items-center gap-2 text-blue-100">
                {getCategoryIcon(listing.category)}
                <span className="text-lg">{listing.category || "Uncategorized"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">GH₵ {(listing.price)}</div>
              <div className="text-blue-200 text-sm mt-1">
                Updated {formatDate(listing.updatedAt)}
              </div>
            </div>
          </div>
        </div>

     

        {/* Description Section */}
        {listing.description && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
          </div>
        )}

        {/* Contact Information */}
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-600" />
            Contact Information
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {listing.contactPhone && (
              <InfoItem
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={listing.contactPhone}
                isClickable={true}
                onClick={() => window.open(`tel:${listing.contactPhone}`, '_self')}
              />
            )}
            {listing.email && (
              <InfoItem
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={listing.email}
                isClickable={true}
                onClick={() => window.open(`mailto:${listing.email}`, '_self')}
              />
            )}
            {listing.address && (
              <InfoItem
                icon={<MapPin className="w-4 h-4" />}
                label="Address"
                value={listing.address}
                isClickable={true}
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(listing.address)}`, '_blank')}
              />
            )}
          </div>
        </div>

        {/* Category-specific Details */}
        {extraFields && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {getCategoryIcon(listing.category)}
              {listing.category} Details
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    icon={icon || <Tag className="w-4 h-4" />}
                    label={label}
                    value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Listed on {formatDate(listing.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ListingInfo;