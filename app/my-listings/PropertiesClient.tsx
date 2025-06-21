'use client';
import ListingCard from "../components/listings/ListingCard";
import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

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
                    <div key={field}>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            {config.label}
                        </label>
                        <input
                            type={config.type}
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                            placeholder={config.placeholder}
                        />
                    </div>
                );
                
            case 'textarea':
                return (
                    <div key={field}>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            {config.label}
                        </label>
                        <textarea
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            rows={4}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
                            placeholder={config.placeholder}
                        />
                    </div>
                );
                
            case 'select':
                return (
                    <div key={field}>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            {config.label}
                        </label>
                        <select
                            name={field}
                            value={fieldValue ?? ''}
                            onChange={onInputChange}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50 focus:bg-white"
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
                    <div key={field} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl">
                        <input
                            type="checkbox"
                            name={field}
                            checked={Boolean(fieldValue)}
                            onChange={onInputChange}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="text-sm font-medium text-slate-700">
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
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                        General Information
                    </h3>
                    <div className="space-y-6">
                        {generalFields.map(field => renderField(field))}
                    </div>
                </div>

                {/* Category-Specific Section */}
                {categorySpecificFields.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                            {currentListing.category} Details
                        </h3>
                        <div className="space-y-6">
                            {categorySpecificFields.map(field => renderField(field))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-white border-b border-slate-200/60 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
                <div className="relative px-6 py-8 sm:px-8 lg:px-12">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                    My Listings
                                </h1>
                                <p className="mt-2 text-slate-600 text-lg">
                                    Manage and organize your listings
                                </p>
                            </div>
                            <div className="hidden sm:flex items-center space-x-4">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                                    {localListings.length} Listing(s)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Property Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-2xl z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Edit Listing</h2>
                                    <p className="text-slate-600 mt-1">
                                        Update your {getCurrentListing()?.category} listing
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors duration-200 group"
                                    aria-label="Close"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-6 h-6 text-slate-500 group-hover:text-slate-700"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={(e) => { e.preventDefault(); onSubmitEdit(); }} className="p-8">
                            {renderFieldSections()}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-8 mt-8 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200 font-medium border border-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Property Listings */}
            <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8 lg:px-12">
                {localListings.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-12 h-12 text-slate-400"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No listing yet</h3>
                        <p className="text-slate-600">Start by adding your first listing.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {localListings.map((listing) => (
                            <div key={listing.id} className="group relative">
                                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-300 transform hover:-translate-y-1 overflow-hidden">
                                    <ListingCard
                                        data={listing}
                                        actionId={listing.id}
                                        onAction={() => {}}
                                        disabled={deletingId === listing.id || editingId === listing.id}
                                        actionLabel=""
                                    />
                                    
                                    {/* Action Buttons Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-3 rounded-2xl">
                                        <button
                                            onClick={() => onEdit(listing)}
                                            disabled={deletingId === listing.id || editingId === listing.id}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-4 h-4"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                            <span>Edit</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => onCancel(listing.id)}
                                            disabled={deletingId === listing.id || editingId === listing.id}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
                                        >
                                            {deletingId === listing.id ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Deleting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={1.5}
                                                        stroke="currentColor"
                                                        className="w-4 h-4"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342-.052.682-.107 1.022-.166m-1.022.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                    <span>Delete</span>
                                                </>
                                            )}
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