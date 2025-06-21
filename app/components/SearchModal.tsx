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
    <div className="flex flex-col gap-6">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className={`flex items-center gap-2 ${step >= STEPS.LOCATION ? 'text-blue-600' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            step >= STEPS.LOCATION 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            1
          </div>
          <span>Location</span>
        </div>
        <div className={`flex items-center gap-2 ${step >= STEPS.DATE ? 'text-blue-600' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            step >= STEPS.DATE 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
          <span>Dates</span>
        </div>
      </div>

      {/* Content based on step */}
      <div className="min-h-[300px] flex flex-col justify-center">
        {step === STEPS.LOCATION && (
          <div className="space-y-6 animate-fadeIn">
            <Heading
              title="Where do you want to go?"
              subtitle="Find your ideal listing!"
              center
              variant="gradient"
              animated
            />
            
            <div className="relative">
              <Input 
                id="location" 
                label="Location" 
                placeholder="Enter a city, address, or landmark"
                register={register} 
                errors={errors} 
                required
                className="text-lg"
              />
              
              {/* Location suggestions or recent searches could go here */}
              {locationValue && locationValue.length > 2 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                  <div className="p-3 text-sm text-gray-500">
                    Press Next to continue with "{locationValue}"
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === STEPS.DATE && (
          <div className="space-y-6 animate-fadeIn">
            <Heading
              title="When are you planning to visit?"
              subtitle="Select your preferred dates"
              center
              variant="gradient"
              animated
            />

            {/* Messages */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-fadeIn">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-700 font-medium">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-fadeIn">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
            )}

            {/* Date Range Picker with custom styling */}
            <div className="flex justify-center">
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <DateRange
                  ranges={[dateRange]}
                  onChange={(ranges) => setDateRange(ranges.selection)}
                  moveRangeOnFirstSelection={false}
                  editableDateInputs={true}
                  className="w-full"
                  rangeColors={['#3B82F6']}
                  color="#3B82F6"
                />
              </div>
            </div>

            {/* Date summary */}
            {dateRange.startDate && dateRange.endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center animate-fadeIn">
                <p className="text-blue-700 font-medium">
                  Selected: {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))}
                </p>
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