'use client';

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import useSearchModal from "../hooks/useSearchModal";
import Modal from "./modals/Modal";
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import axios from 'axios';
import qs from "query-string";
import { formatISO } from "date-fns";
import Heading from "./Heading";
import Input from "./inputs/Input";

enum STEPS {
  LOCATION = 0,
  DATE = 1,
}

const SearchModal = () => {
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(STEPS.LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const locationValue = watch('location');

  const onBack = useCallback(() => {
    setStep((value) => value - 1);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const onNext = useCallback(() => {
    setStep((value) => value + 1);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleClose = useCallback(() => {
    searchModal.onClose();
    setStep(STEPS.LOCATION);
    setErrorMessage('');
    setSuccessMessage('');
    reset();
  }, [searchModal, reset]);

  const onSubmit = useCallback(
    async (data: any) => {
      if (step !== STEPS.DATE) {
        return onNext();
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        // Call API to search for location
        const response = await axios.get(`/api/query`, {
          params: { address: data.location }
        });

        if (response.status === 200) {
          const listing = response.data;
          let currentQuery = {};
          if (params) {
            currentQuery = qs.parse(params.toString());
          }

          const updateQuery: { location?: string; startDate?: string; endDate?: string } = {
            ...currentQuery,
            location: listing?.address,
          };

          if (dateRange.startDate) {
            updateQuery.startDate = formatISO(dateRange.startDate);
          }
          if (dateRange.endDate) {
            updateQuery.endDate = formatISO(dateRange.endDate);
          }

          const url = qs.stringifyUrl({
            url: '/',
            query: updateQuery
          }, { skipNull: true });

          setSuccessMessage("Search completed successfully!");
          
          // Delay navigation for better UX
          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 1000);
        }
      } catch (error) {
        setErrorMessage("Location not found. Please try a different location.");
        console.error("Error fetching location:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [step, onNext, params, dateRange, router, handleClose]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return "Searching...";
    return step === STEPS.DATE ? "Search" : "Next";
  }, [step, isLoading]);

  // Progress indicator
  const progressPercentage = ((step + 1) / Object.keys(STEPS).length * 50) * 100;

  const bodyContent = (
    <div className="flex flex-col gap-8 p-2">
      {/* Enhanced Progress Section */}
      <div className="space-y-4">
        {/* Animated Progress Bar */}
        <div className="relative w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-700 ease-out shadow-lg"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
          </div>
        </div>

        {/* Enhanced Step Indicator */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-all duration-300 ${
            step >= STEPS.LOCATION ? 'text-blue-600 scale-105' : 'text-gray-400'
          }`}>
            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= STEPS.LOCATION 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step > STEPS.LOCATION ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                "1"
              )}
            </div>
            <span className="font-semibold">Location</span>
          </div>
          
          <div className="flex-1 mx-4 h-px bg-gradient-to-r from-gray-300 to-gray-200"></div>
          
          <div className={`flex items-center gap-3 transition-all duration-300 ${
            step >= STEPS.DATE ? 'text-blue-600 scale-105' : 'text-gray-400'
          }`}>
            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= STEPS.DATE 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="font-semibold">Dates</span>
          </div>
        </div>
      </div>

      {/* Content Section with Enhanced Styling */}
      <div className="min-h-[400px] flex flex-col justify-center">
        {step === STEPS.LOCATION && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg shadow-blue-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Where do you want to go?
              </h2>
              <p className="text-gray-600 text-lg">
                Find your ideal listing and start planning your perfect stay
              </p>
            </div>
            
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                <Input 
                  id="location" 
                  label="Location" 
                  placeholder="Enter a city, address, or landmark"
                  register={register} 
                  errors={errors} 
                  required
                  className="text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl px-4 py-3 transition-all duration-300"
                />
                
                {/* Enhanced Location Preview */}
                {locationValue && locationValue.length > 2 && (
                  <div className="absolute top-full left-6 right-6 bg-white/95 backdrop-blur-sm border border-blue-200 rounded-xl shadow-lg z-10 mt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-blue-700 font-medium">
                        Ready to search for "{locationValue}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === STEPS.DATE && (
          <div className="space-y-8 animate-in slide-in-from-left-5 duration-500">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4 shadow-lg shadow-purple-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                When are you planning to visit?
              </h2>
              <p className="text-gray-600 text-lg">
                Select your preferred dates for the perfect getaway
              </p>
            </div>

            {/* Enhanced Messages */}
            {errorMessage && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-3 duration-300 shadow-lg">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-800 font-semibold">{errorMessage}</p>
                  <p className="text-red-600 text-sm mt-1">Please try again with a different search term</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-3 duration-300 shadow-lg">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-800 font-semibold">{successMessage}</p>
                  <p className="text-green-600 text-sm mt-1">Redirecting you to your results...</p>
                </div>
              </div>
            )}

            {/* Enhanced Date Range Picker */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl overflow-hidden shadow-2xl">
                  <DateRange
                    ranges={[dateRange]}
                    onChange={(ranges) => setDateRange(ranges.selection)}
                    moveRangeOnFirstSelection={false}
                    editableDateInputs={true}
                    className="w-full"
                    rangeColors={['#6366F1']}
                    color="#6366F1"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Date Summary */}
            {dateRange.startDate && dateRange.endDate && (
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-6 text-center animate-in slide-in-from-bottom-3 duration-500 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-800 font-bold text-lg">Selected Dates</span>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-800 font-semibold text-xl mb-2">
                    {dateRange.startDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })} - {dateRange.endDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white/60 rounded-full px-4 py-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-indigo-700 font-medium">
                      {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))} 
                      {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) === 1 ? ' day' : ' days'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      title="Find Your Perfect Stay"
      actionLabel={actionLabel}
      secondaryActionLabel={step === STEPS.DATE ? "Back" : undefined}
      secondaryAction={step === STEPS.DATE ? onBack : undefined}
      body={bodyContent}
      disabled={isLoading}
    />
  );
};

export default SearchModal;