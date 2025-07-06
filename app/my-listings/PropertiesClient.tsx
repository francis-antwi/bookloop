'use client';
import ListingCard from "../components/listings/ListingCard";
import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import OccupancyChart from "../components/OccupancyChart";
import PriceSuggestionChart from "../components/PriceSuggestionChart";

// Type definition to match Prisma model
type ListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Listing {
    id: string;
    title: string;
    description: string;
    imageSrc: string[];
    createdAt: Date;
    category: string;
    userId: string;
    price: number;
    email?: string | null;
    contactPhone?: string | null;
    address?: string | null;
    status: ListingStatus;
    
    // Apartment-specific fields
    bedrooms?: number | null;
    bathrooms?: number | null;
    furnished?: boolean | null;
    floor?: number | null;

    // Car-specific fields
    make?: string | null;
    model?: string | null;
    year?: number | null;
    seats?: number | null;
    fuelType?: string | null;

    // Event Center-specific fields
    capacity?: number | null;
    rooms?: number | null;
    hasStage?: boolean | null;
    parkingAvailable?: boolean | null;

    // Restaurant-specific fields
    cuisineType?: string | null;
    seatingCapacity?: number | null;
    openingHours?: string | null;
    deliveryAvailable?: boolean | null;
    menuHighlights?: string | null;

    // Appointment-specific fields
    serviceType?: string | null;
    availableDates?: string | null;
    duration?: number | null;
    requiresBooking?: boolean | null;
    serviceProvider?: string | null;
}

interface PropertiesClientProps {
    listings: Listing[];
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({ listings }) => {
    const [localListings, setLocalListings] = useState(listings);
    const [deletingId, setDeletingId] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        id: '',
        title: '',
        description: '',
        imageSrc: [] as string[],
        createdAt: new Date(),
        category: '',
        userId: '',
        price: 0,
        email: null as string | null,
        contactPhone: null as string | null,
        address: null as string | null,
        status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
        
        // Apartment-specific fields (nullable)
        bedrooms: null as number | null,
        bathrooms: null as number | null,
        furnished: null as boolean | null,
        floor: null as number | null,
        
        // Car-specific fields (nullable)
        make: null as string | null,
        model: null as string | null,
        year: null as number | null,
        seats: null as number | null,
        fuelType: null as string | null,
        
        // Event Center-specific fields (nullable)
        capacity: null as number | null,
        rooms: null as number | null,
        hasStage: null as boolean | null,
        parkingAvailable: null as boolean | null,
        
        // Restaurant-specific fields (nullable)
        cuisineType: null as string | null,
        seatingCapacity: null as number | null,
        openingHours: null as string | null,
        deliveryAvailable: null as boolean | null,
        menuHighlights: null as string | null,
        
        // Appointment-specific fields (nullable)
        serviceType: null as string | null,
        availableDates: null as string | null,
        duration: null as number | null,
        requiresBooking: null as boolean | null,
        serviceProvider: null as string | null,
    });

    // Define general fields that apply to all categories
    const generalFields = ['title', 'description', 'price', 'address', 'contactPhone', 'email'];
    
    // Define which fields are relevant to each category
    const categoryFields: Record<string, string[]> = {
        Apartment: ['bedrooms', 'bathrooms', 'furnished', 'floor'],
        Car: ['make', 'model', 'year', 'seats', 'fuelType'],
        EventCenter: ['capacity', 'rooms', 'hasStage', 'parkingAvailable'],
        Restaurant: ['cuisineType', 'seatingCapacity', 'openingHours', 'deliveryAvailable', 'menuHighlights'],
        Appointment: ['serviceType', 'availableDates', 'duration', 'requiresBooking', 'serviceProvider'],
    };

    // Enhanced field configuration
    const fieldConfig: Record<string, { type: string; placeholder: string; options?: string[]; label?: string }> = {
        // General fields
        title: { type: 'text', placeholder: 'Enter an attractive listing title', label: 'Title' },
        description: { type: 'textarea', placeholder: 'Describe the key features and benefits of your listing', label: 'Description' },
        price: { type: 'number', placeholder: '0', label: 'Price ($)' },
        contactPhone: { type: 'tel', placeholder: '+1 (555) 123-4567', label: 'Contact Phone' },
        address: { type: 'text', placeholder: 'Street address, City, State, ZIP', label: 'Address' },
        email: { type: 'email', placeholder: 'Enter email', label: 'Email' },
        
        // Apartment-specific fields
        bedrooms: { type: 'number', placeholder: 'Number of bedrooms', label: 'Bedrooms' },
        bathrooms: { type: 'number', placeholder: 'Number of bathrooms', label: 'Bathrooms' },
        furnished: { type: 'checkbox', placeholder: 'Is furnished?', label: 'Furnished' },
        floor: { type: 'number', placeholder: 'Floor number', label: 'Floor' },
        
        // Car-specific fields
        make: { type: 'text', placeholder: 'Car make (e.g., Toyota)', label: 'Make' },
        model: { type: 'text', placeholder: 'Car model (e.g., Camry)', label: 'Model' },
        year: { type: 'number', placeholder: 'Year of manufacture', label: 'Year' },
        seats: { type: 'number', placeholder: 'Number of seats', label: 'Seats' },
        fuelType: { type: 'select', placeholder: 'Select fuel type', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], label: 'Fuel Type' },
        
        // Event Center-specific fields
        capacity: { type: 'number', placeholder: 'Maximum capacity', label: 'Capacity' },
        rooms: { type: 'number', placeholder: 'Number of rooms', label: 'Rooms' },
        hasStage: { type: 'checkbox', placeholder: 'Has stage?', label: 'Has Stage' },
        parkingAvailable: { type: 'checkbox', placeholder: 'Parking available?', label: 'Parking Available' },
        
        // Restaurant-specific fields
        cuisineType: { type: 'text', placeholder: 'Type of cuisine (e.g., Italian, Chinese)', label: 'Cuisine Type' },
        seatingCapacity: { type: 'number', placeholder: 'Seating capacity', label: 'Seating Capacity' },
        openingHours: { type: 'text', placeholder: 'Opening hours (e.g., 9 AM - 10 PM)', label: 'Opening Hours' },
        deliveryAvailable: { type: 'checkbox', placeholder: 'Delivery available?', label: 'Delivery Available' },
        menuHighlights: { type: 'textarea', placeholder: 'Menu highlights and special dishes', label: 'Menu Highlights' },
        
        // Appointment-specific fields
        serviceType: { type: 'text', placeholder: 'Type of service (e.g., Consultation, Therapy)', label: 'Service Type' },
        availableDates: { type: 'text', placeholder: 'Available dates (e.g., Mon-Fri, Weekends)', label: 'Available Dates' },
        duration: { type: 'number', placeholder: 'Duration in minutes', label: 'Duration (minutes)' },
        requiresBooking: { type: 'checkbox', placeholder: 'Requires booking?', label: 'Requires Booking' },
        serviceProvider: { type: 'text', placeholder: 'Service provider name', label: 'Service Provider' },
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' 
                ? checked 
                : type === 'number' 
                    ? (value === '' ? null : Number(value))
                    : (value === '' ? null : value),
        }));
    };

    // Edit function - initialize form with listing data
    const onEdit = useCallback((listing: Listing) => {
        setFormData({ ...listing });
        setEditingId(listing.id);
    }, []);

    // Delete function
    const onCancel = useCallback(async (id: string) => {
        setDeletingId(id);
        try {
            await axios.delete(`/api/listings/${id}`);
            setLocalListings(prevListings => 
                prevListings.filter(listing => listing.id !== id)
            );
            toast.success("Listing deleted successfully!");
        } catch (error) {
            toast.error("Failed to delete the listing");
            console.error("Error deleting listing:", error);
        } finally {
            setDeletingId('');
        }
    }, []);

    const onSubmitEdit = async () => {
        if (!editingId) return;

        // Basic validation
        if (!formData.title || !formData.price) {
            toast.error("Please fill in all required fields.");
            return;
        }

        try {
            const response = await axios.put(`/api/properties/${editingId}`, formData);
            const updatedListing = response.data;

            setLocalListings(prevListings =>
                prevListings.map(listing =>
                    listing.id === updatedListing.id ? updatedListing : listing
                )
            );

            toast.success("Listing updated successfully!");
            setEditingId(null);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axios error:", error.response?.data || error.message);
            } else {
                console.error("Unexpected error:", error);
            }
            toast.error("Failed to update the listing.");
        }
    };

    // Get the current listing being edited to determine its category
    const getCurrentListing = () => {
        return localListings.find(listing => listing.id === editingId);
    };

    // Get fields to show based on the listing's category (not form category)
    const getFieldsToShow = () => {
        const currentListing = getCurrentListing();
        if (!currentListing) return generalFields;
        
        const categorySpecificFields = categoryFields[currentListing.category] || [];
        return [...generalFields, ...categorySpecificFields];
    };

    const renderField = (field: string) => {
        const config = fieldConfig[field];
        if (!config) return null;

        const fieldValue = formData[field as keyof typeof formData];

        switch (config.type) {
            case 'text':
            case 'number':
            case 'tel':
            case 'email':
                return (
                    <div key={field} className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {config.label}
                            <span className="text-red-500 ml-1">{['title', 'price'].includes(field) ? '*' : ''}</span>
                        </label>
                        <input
                            type={config.type}
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder={config.placeholder}
                        />
                    </div>
                );
                
            case 'textarea':
                return (
                    <div key={field} className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {config.label}
                        </label>
                        <textarea
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder={config.placeholder}
                        />
                    </div>
                );
                
            case 'select':
                return (
                    <div key={field} className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {config.label}
                        </label>
                        <select
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                        >
                            <option value="">{config.placeholder || `Select ${config.label}`}</option>
                            {config.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                );
                
            case 'checkbox':
                return (
                    <div key={field} className="flex items-center mb-6">
                        <input
                            type="checkbox"
                            name={field}
                            checked={Boolean(fieldValue)}
                            onChange={onInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                            {config.label}
                        </label>
                    </div>
                );
                
            default:
                return null;
        }
    };

    // Render fields grouped by category for better organization
    const renderFieldSections = () => {
        const currentListing = getCurrentListing();
        if (!currentListing) return null;

        const categorySpecificFields = categoryFields[currentListing.category] || [];

        return (
            <div className="space-y-8">
                {/* General Information Section */}
                <div className="bg-gray-50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        General Information
                    </h3>
                    <div className="space-y-4">
                        {generalFields.map(field => renderField(field))}
                    </div>
                </div>

                {/* Category-Specific Section */}
                {categorySpecificFields.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            {currentListing.category} Details
                        </h3>
                        <div className="space-y-4">
                            {categorySpecificFields.map(field => renderField(field))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="mb-4 sm:mb-0">
                            <h1 className="text-3xl font-bold text-gray-900">
                                My Listings
                            </h1>
                            <p className="mt-1 text-gray-600">
                                Manage and organize your property listings
                            </p>
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                            {localListings.length} {localListings.length === 1 ? 'Listing' : 'Listings'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Property Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Edit Listing</h2>
                                    <p className="text-gray-600 text-sm">
                                        Update your {getCurrentListing()?.category} listing details
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="text-gray-400 hover:text-gray-500 transition-colors"
                                    aria-label="Close"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={(e) => { e.preventDefault(); onSubmitEdit(); }} className="p-6">
                            {renderFieldSections()}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Property Listings */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {localListings.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                        <p className="text-gray-600">Get started by creating your first listing</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localListings.map((listing) => (
                            <div key={listing.id} className="group relative">
                                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 overflow-hidden">
                                    <ListingCard
                                        data={listing}
                                        actionId={listing.id}
                                        onAction={() => {}}
                                        disabled={deletingId === listing.id || editingId === listing.id}
                                        actionLabel=""
                                    />
                                    {listing.status === 'APPROVED' && (
                                        <div className="p-4">
                                            <OccupancyChart listingId={listing.id} />
                                        </div>
                                    )}
                                    <PriceSuggestionChart listingId={listing.id} />

                                    {/* Action Buttons Overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center space-x-3">
                                        <button
                                            onClick={() => onEdit(listing)}
                                            disabled={deletingId === listing.id || editingId === listing.id}
                                            className="bg-white text-blue-600 px-3 py-1.5 rounded-md font-medium transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>Edit</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => onCancel(listing.id)}
                                            disabled={deletingId === listing.id || editingId === listing.id}
                                            className="bg-white text-red-600 px-3 py-1.5 rounded-md font-medium transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
                                        >
                                            {deletingId === listing.id ? (
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                            <span>{deletingId === listing.id ? 'Deleting...' : 'Delete'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertiesClient;