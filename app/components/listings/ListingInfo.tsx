import React, { useState } from "react";
import { Calendar, MapPin, Phone, Mail, Tag, Clock, Users, Car, Home, Building, Utensils, Settings, X, ChevronDown, ChevronUp } from "lucide-react";

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
    className={`flex items-start gap-3 p-4 bg-white rounded-xl border transition-all duration-200 ${
      isClickable 
        ? 'hover:bg-blue-50 hover:border-blue-200 border-gray-200 cursor-pointer hover:shadow-md active:scale-95' 
        : 'border-gray-100 hover:border-gray-200'
    }`}
    onClick={onClick}
  >
    <div className={`flex-shrink-0 mt-0.5 ${isClickable ? 'text-blue-600' : 'text-gray-500'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 leading-tight">{label}</p>
      <p className={`text-sm mt-1 ${isClickable ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
        {value.toString()}
      </p>
    </div>
    {isClickable && (
      <div className="text-blue-500 opacity-60 flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    )}
  </div>
);

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="text-gray-600">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="text-gray-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      <div className={`transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const QuickContactButtons: React.FC<{ listing: any }> = ({ listing }) => (
  <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:hidden">
    <div className="flex gap-3">
      {listing.contactPhone && (
        <button
          onClick={() => window.open(`tel:${listing.contactPhone}`, '_self')}
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
);

const ListingInfo: React.FC<ListingInfoProps> = ({ listing }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (!listing) {
    return null;
  }

  const extraFields = listing.category ? categorySpecificFields[listing.category] : null;

  return (
    <>
      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              className="absolute -top-10 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
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

      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <div className="max-w-4xl mx-auto">
          {/* Header Section - Mobile Optimized */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-blue-100 mb-2">
                    {getCategoryIcon(listing.category)}
                    <span className="text-sm sm:text-base font-medium">{listing.category || "Uncategorized"}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight">
                    {listing.title || "Untitled Listing"}
                  </h1>
                </div>
                <div className="flex flex-row sm:flex-col items-start sm:items-end sm:text-right gap-2 sm:gap-1">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-300">
                    GH₵ {listing.price || 'N/A'}
                  </div>
                  <div className="text-blue-200 text-xs sm:text-sm">
                    Updated {formatDate(listing.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Description Section */}
            {listing.description && (
              <CollapsibleSection
                title="Description"
                icon={<Tag className="w-5 h-5" />}
                defaultOpen={true}
              >
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{listing.description}</p>
              </CollapsibleSection>
            )}

            {/* Contact Information */}
            <CollapsibleSection
              title="Contact Information"
              icon={<Phone className="w-5 h-5" />}
              defaultOpen={true}
            >
              <div className="grid gap-3 sm:gap-4">
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
            </CollapsibleSection>

            {/* Category-specific Details */}
            {extraFields && (
              <CollapsibleSection
                title={`${listing.category} Details`}
                icon={getCategoryIcon(listing.category)}
                defaultOpen={false}
              >
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
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
              </CollapsibleSection>
            )}

            {/* Footer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Listed on {formatDate(listing.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Contact Bar */}
        <QuickContactButtons listing={listing} />
      </div>
    </>
  );
};

export default ListingInfo;