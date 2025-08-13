'use client';
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMemo, useState, useEffect } from "react";
import { FieldValues, SubmitHandler } from "react-hook-form";
import { categories } from "../navbar/Categories";
import CategoryInput from "../inputs/CategoryInput"; 
import Input from "../inputs/Input";
import Modal from "./Modal";
import useRentModal from "@/app/hooks/useRental";
import ImageUpload from "../inputs/ImageUpload";
import { useSession } from "next-auth/react";

const baseSteps = ['CATEGORY', 'IMAGES', 'DESCRIPTION', 'PRICE', 'CONTACT'];

// Map ServiceCategory enum to category labels
const serviceCategoryToLabel = {
  APARTMENTS: 'Apartments',
  CARS: 'Cars',
  EVENT_CENTERS: 'Event Centers',
  HOTEL_ROOMS: 'Hotel Rooms',
  TOUR_SERVICES: 'Tour Services',
  EVENT_TICKETS: 'Event Tickets',
  RESTAURANTS: 'Restaurants',
  APPOINTMENTS: 'Appointments'
};

const categorySpecificFields = {
  Apartments: {
    extraFields: {
      bedrooms: { label: 'Bedrooms', type: 'number', required: true },
      bathrooms: { label: 'Bathrooms', type: 'number', required: true },
      furnished: { label: 'Furnished', type: 'checkbox', required: false },
      floor: { label: 'Floor Number', type: 'number', required: false },
    }
  },
  Cars: {
    extraFields: {
      make: { label: 'Make', type: 'text', required: true },
      model: { label: 'Model', type: 'text', required: true },
      year: { label: 'Year', type: 'number', required: true },
      seats: { label: 'Number of Seats', type: 'number', required: false },
      fuelType: { label: 'Fuel Type', type: 'text', required: false },
    }
  },
  'Event Centers': {
    extraFields: {
      capacity: { label: 'Capacity', type: 'number', required: true },
      rooms: { label: 'Number of Rooms', type: 'number', required: false },
      hasStage: { label: 'Has Stage', type: 'checkbox', required: false },
      parkingAvailable: { label: 'Parking Available', type: 'checkbox', required: false },
    }
  },
  Restaurants: {
    extraFields: {
      cuisineType: { label: 'Cuisine Type', type: 'text', required: true },
      seatingCapacity: { label: 'Seating Capacity', type: 'number', required: true },
      openingHours: { label: 'Opening Hours', type: 'text', required: true },
      deliveryAvailable: { label: 'Delivery Available', type: 'checkbox', required: false },
      menuHighlights: { label: 'Menu Highlights', type: 'text', required: false },
    }
  },
  Appointments: {
    extraFields: {
      serviceType: { label: 'Service Type', type: 'text', required: true },
      availableDates: { label: 'Available Dates', type: 'text', required: true },
      duration: { label: 'Appointment Duration (mins)', type: 'number', required: true },
      requiresBooking: { label: 'Requires Prior Booking', type: 'checkbox', required: false },
      serviceProvider: { label: 'Service Provider Name', type: 'text', required: false },
    }
  },
  'Hotel Rooms': {
    extraFields: {
      bedrooms: { label: 'Bedrooms', type: 'number', required: true },
      bathrooms: { label: 'Bathrooms', type: 'number', required: true },
      roomType: { label: 'Room Type', type: 'text', required: true },
      amenities: { label: 'Amenities', type: 'text', required: false },
    }
  },
  'Tour Services': {
    extraFields: {
      duration: { label: 'Tour Duration (hours)', type: 'number', required: true },
      groupSize: { label: 'Maximum Group Size', type: 'number', required: true },
      languages: { label: 'Available Languages', type: 'text', required: false },
      includes: { label: 'What\'s Included', type: 'text', required: false },
    }
  },
  'Event Tickets': {
    extraFields: {
      eventDate: { label: 'Event Date', type: 'date', required: true },
      venue: { label: 'Venue', type: 'text', required: true },
      ticketType: { label: 'Ticket Type', type: 'text', required: false },
      seatInfo: { label: 'Seat Information', type: 'text', required: false },
    }
  }
};

const ProgressStepper = ({ steps, currentStep }) => {
  return (
    <div className="relative w-full mb-12">
      {/* Background line */}
      <div className="absolute top-5 left-0 w-full h-0.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
      
      {/* Progress line */}
      <div 
        className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      ></div>
      
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center group">
            <div className={`
              relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold 
              transition-all duration-500 ease-out transform hover:scale-110
              ${index <= currentStep 
                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/25 ring-4 ring-white' 
                : 'bg-white text-gray-400 border-2 border-gray-200 shadow-sm'
              }
            `}>
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
              
              {/* Pulse animation for current step */}
              {index === currentStep && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 animate-ping opacity-20"></div>
              )}
            </div>
            
            {/* Step label */}
            <div className={`
              mt-3 text-xs font-medium text-center px-2 py-1 rounded-full transition-all duration-300
              ${index <= currentStep 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-gray-400'
              }
            `}>
              {step.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RentModal = () => {
  const router = useRouter();
  const rentModal = useRentModal();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userBusinessInfo, setUserBusinessInfo] = useState(null);
  const [filteredCategories, setFilteredCategories] = useState(categories);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      category: '',
      imageSrc: [],
      price: 1,
      title: '',
      description: '',
      contactPhone: '',
      email: '',
      address: '',
      // Default values for all possible fields
      bedrooms: '', bathrooms: '', furnished: false, floor: '',
      make: '', model: '', year: '', seats: '', fuelType: '',
      capacity: '', rooms: '', hasStage: false, parkingAvailable: false,
      cuisineType: '', seatingCapacity: '', openingHours: '', deliveryAvailable: false, menuHighlights: '',
      serviceType: '', availableDates: '', duration: '', requiresBooking: false, serviceProvider: '',
      roomType: '', amenities: '', groupSize: '', languages: '', includes: '',
      eventDate: '', venue: '', ticketType: '', seatInfo: ''
    }
  });

  const category = watch('category');
  const imageSrc = watch('imageSrc');
  const extraStep = category && categorySpecificFields[category] ? `${category.toUpperCase()}_DETAILS` : null;
  const steps = extraStep ? [...baseSteps, extraStep] : baseSteps;

  // Fetch user business information when modal opens
  useEffect(() => {
    if (rentModal.isOpen && session?.user) {
      fetchUserBusinessInfo();
    }
  }, [rentModal.isOpen, session]);

  const fetchUserBusinessInfo = async () => {
    try {
      const response = await axios.get('/api/user/business-info');
      const userData = response.data;
      setUserBusinessInfo(userData);

      // Filter categories based on business verification
      if (userData.businessVerified && userData.businessVerification?.allowedCategories) {
        const allowedCategories = userData.businessVerification.allowedCategories;
        
        const filtered = categories.filter(cat => 
          allowedCategories.some(allowed => 
            serviceCategoryToLabel[allowed] === cat.label
          )
        );
        
        setFilteredCategories(filtered);
        
        // Show info message about restricted categories
        if (filtered.length < categories.length && filtered.length > 0) {
          toast.success(`Showing categories available for your business`);
        } else if (filtered.length === 0) {
          toast.error(`No categories available for your business`);
        }
      } else {
        // Non-business verified users see all categories
        setFilteredCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching user business info:', error);
      // If error, show all categories as fallback
      setFilteredCategories(categories);
    }
  };

  const setCustomValue = (id, value) => {
    setValue(id, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };
  const onBack = () => setStep((value) => value - 1);
  const onNext = async () => {
    if (steps[step] === 'CATEGORY') {
      const isValid = await trigger('category');
      if (!isValid) {
        toast.error("Please select a category.");
        return;
      }
    }
    if (steps[step]?.endsWith('_DETAILS')) {
      const extraFields = categorySpecificFields[category]?.extraFields;
      if (extraFields) {
        const fieldNames = Object.keys(extraFields);
        const valid = await trigger(fieldNames);
        if (!valid) {
          toast.error("Please fill out all required fields.");
          return;
        }
      }
    }
    setStep((value) => value + 1);
  };
  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step < steps.length - 1) {
      await onNext();
      return;
    }
    setIsLoading(true);
    // Ensure imageSrc is an array before submitting
    if (!Array.isArray(data.imageSrc)) {
      data.imageSrc = [];
    }
    axios.post('/api/listings', data)
      .then(() => {
        toast.success('Listing created successfully! 🎉');
        router.refresh();
        reset();
        setStep(0);
        rentModal.onClose();
      })
      .catch((error) => {
        const errorMessage = error.response?.data?.error || 'Something went wrong';
        toast.error(errorMessage);
      })
      .finally(() => setIsLoading(false));
  };
  const actionLabel = useMemo(() => step === steps.length - 1 ? 'Create Listing' : 'Continue', [step, steps.length]);
  const secondaryActionLabel = useMemo(() => step === 0 ? undefined : 'Back', [step]);
  const handleClose = () => {
    reset();
    setStep(0);
    setFilteredCategories(categories); // Reset to all categories
    setUserBusinessInfo(null);
    rentModal.onClose();
  };

  let bodyContent = null;
  
  if (steps[step] === 'CATEGORY') {
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            What are you listing?
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            {userBusinessInfo?.businessVerified 
              ? 'Choose from categories available for your business'
              : 'Choose the category that best describes your listing to get started'
            }
          </p>
          
          {/* Business verification status indicator */}
          {userBusinessInfo?.businessVerified && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 border border-green-200">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 font-medium text-sm">Business Verified</span>
            </div>
          )}
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        {filteredCategories.length === 0 ? (
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Categories Available</h3>
            <p className="text-gray-500">
              No listing categories are available for your business type. 
              Please contact support for assistance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {filteredCategories.map((item) => (
              <div
                key={item.label}
                className="transform transition-all duration-200 hover:scale-105 hover:-translate-y-1"
              >
                <CategoryInput
                  icon={item.icon}
                  label={item.label}
                  selected={category === item.label}
                  onClick={(value) => setCustomValue('category', value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (steps[step] === 'IMAGES') {
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Add stunning photos
          </h2>
          <div className="space-y-2">
            <p className="text-gray-500 text-lg leading-relaxed">
              Great photos help your listing stand out and attract more customers
            </p>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
              <svg className="w-4 h-4 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-amber-700 font-medium text-sm">Add at least 4 images for best results</span>
            </div>
          </div>
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100">
          <ImageUpload
            value={imageSrc}
            onChange={(value) => setCustomValue('imageSrc', value)}
          />
        </div>
      </div>
    );
  } else if (steps[step] === 'DESCRIPTION') {
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Describe your listing
          </h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">
            Help people understand what makes your listing special and unique
          </p>
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 space-y-6">
            <Input 
              id="title" 
              label="Title" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
            <Input 
              id="description" 
              label="Description" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
          </div>
        </div>
      </div>
    );
  } else if (steps[step] === 'PRICE') {
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Set your price
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            Set a competitive price that reflects the value of your listing
          </p>
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100">
            <Input 
              id="price" 
              label="Price" 
              formatPrice 
              type="number" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
          </div>
        </div>
      </div>
    );
  } else if (steps[step] === 'CONTACT') {
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Contact information
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            How can interested customers reach you?
          </p>
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100 space-y-6">
            <Input 
              id="contactPhone" 
              label="Phone Number" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
            <Input 
              id="email" 
              label="Email Address" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
            <Input 
              id="address" 
              label="Address" 
              disabled={isLoading} 
              register={register} 
              errors={errors} 
              required 
            />
          </div>
        </div>
      </div>
    );
  } else if (steps[step]?.endsWith('_DETAILS')) {
    const extraFields = categorySpecificFields[category]?.extraFields;
    bodyContent = (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {category} Details
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
            Provide specific information about your {category.toLowerCase()}
          </p>
        </div>
        
        <ProgressStepper steps={steps} currentStep={step} />
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extraFields && Object.entries(extraFields).map(([fieldName, field]) => (
                <div key={fieldName} className="space-y-2">
                  <Input
                    id={fieldName}
                    label={field.label}
                    type={field.type === 'checkbox' ? 'checkbox' : field.type}
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required={field.required}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Modal
      isOpen={rentModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      actionLabel={actionLabel}
      secondaryActionLabel={secondaryActionLabel}
      secondaryAction={step === 0 ? undefined : onBack}
      title="Create Your Listing"
      body={bodyContent}
    />
  );
};

export default RentModal;