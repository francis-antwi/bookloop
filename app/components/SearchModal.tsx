'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [isListening, setIsListening] = useState(false);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm();
  const locationValue = watch('location');

  // Load ResponsiveVoice
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://code.responsivevoice.org/responsivevoice.js?key=YOUR_KEY";
    script.async = true;
    document.body.appendChild(script);
  }, []);

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

          const url = qs.stringifyUrl({ url: '/', query: updateQuery }, { skipNull: true });

          setSuccessMessage("Search completed successfully!");
          (window as any).responsiveVoice?.speak("Search completed successfully!");

          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 1000);
        }
      } catch (error) {
        setErrorMessage("Location not found. Please try a different location.");
        (window as any).responsiveVoice?.speak("Location not found. Please try a different one.");
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

  const progressPercentage = ((step + 1) / Object.values(STEPS).length) * 100;

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onstart = () => {
      (window as any).responsiveVoice?.speak("Listening. Please say your destination.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setValue('location', transcript, { shouldValidate: true });
      (window as any).responsiveVoice?.speak(`You said ${transcript}. You can press Next to continue.`);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      (window as any).responsiveVoice?.speak("Sorry, I didn't catch that. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const bodyContent = (
    <div className="px-2 py-4 space-y-8">
      {/* Clean Progress Indicator */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-500 font-medium">
          <span>Step {step + 1} of 2</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center space-x-12">
        <div className={`flex items-center space-x-3 ${
          step >= STEPS.LOCATION ? 'text-blue-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= STEPS.LOCATION 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            {step > STEPS.LOCATION ? '✓' : '1'}
          </div>
          <span className="font-medium">Location</span>
        </div>
        
        <div className={`w-16 h-px ${step >= STEPS.DATE ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

        <div className={`flex items-center space-x-3 ${
          step >= STEPS.DATE ? 'text-blue-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= STEPS.DATE 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
          <span className="font-medium">Dates</span>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[350px] flex flex-col justify-center">
        {step === STEPS.LOCATION && (
          <div className="space-y-8 opacity-0 animate-fadeIn" style={{animation: 'fadeIn 0.5s ease-out forwards'}}>
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Where would you like to stay?
              </h2>
              <p className="text-gray-600">Enter your destination to find the perfect place</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input 
                  id="location" 
                  label="Destination" 
                  placeholder="City, address, or landmark..."
                  register={register} 
                  errors={errors} 
                  required
                  className="text-base h-14 pl-12 pr-24 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                
                {/* Location Icon */}
                <div className="absolute left-4 top-10 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                {/* Voice Input */}
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`absolute right-12 top-9 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                  title={isListening ? "Listening..." : "Voice input"}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Read Aloud */}
                <button
                  type="button"
                  onClick={() => {
                    if (locationValue) {
                      (window as any).responsiveVoice?.speak(`You entered ${locationValue}`);
                    } else {
                      (window as any).responsiveVoice?.speak("Please enter a location first");
                    }
                  }}
                  className="absolute right-3 top-9 p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-all"
                  title="Read aloud"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.896-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {isListening && (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Listening...</span>
                </div>
              )}

              {locationValue && locationValue.length > 2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Destination selected:</p>
                      <p className="text-blue-700 font-semibold">{locationValue}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === STEPS.DATE && (
          <div className="space-y-8 opacity-0 animate-fadeIn" style={{animation: 'fadeIn 0.5s ease-out forwards'}}>
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                When do you want to stay?
              </h2>
              <p className="text-gray-600">Select your check-in and check-out dates</p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-700 font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-700 font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <DateRange
                  ranges={[dateRange]}
                  onChange={(ranges) => setDateRange(ranges.selection)}
                  moveRangeOnFirstSelection={false}
                  editableDateInputs={true}
                  className="w-full"
                  rangeColors={['#2563eb']}
                  color="#2563eb"
                />
              </div>
            </div>

            {dateRange.startDate && dateRange.endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-blue-600 mb-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Your Stay</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-lg">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-semibold text-gray-900">
                        {dateRange.startDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="w-8 h-px bg-blue-300"></div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-semibold text-gray-900">
                        {dateRange.endDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 mt-3">
                    {Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))} night{Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                  </p>
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