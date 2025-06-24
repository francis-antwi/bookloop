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
import { SpeechRecognition } from 'speech-recognition-polyfill'; // Import SpeechRecognition

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
    <div className="flex flex-col gap-8">
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="absolute -top-8 left-0 right-0 text-center">
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
            Step {step + 1} of 2
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-3 ${step >= STEPS.LOCATION ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= STEPS.LOCATION ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {step > STEPS.LOCATION ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span>1</span>
            )}
          </div>
          <span className="font-medium">Location</span>
        </div>
        <div className="flex-1 mx-4">
          <div className={`h-0.5 rounded-full ${step >= STEPS.DATE ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
        </div>
        <div className={`flex items-center gap-3 ${step >= STEPS.DATE ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= STEPS.DATE ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            <span>2</span>
          </div>
          <span className="font-medium">Dates</span>
        </div>
      </div>
      <div className="min-h-[400px] flex flex-col justify-center">
        {step === STEPS.LOCATION && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Where do you want to go?</h2>
              <p className="text-gray-600 text-lg">Discover amazing places around the world</p>
            </div>
            <div className="relative">
              <Input 
                id="location" 
                label="Location" 
                placeholder="Enter a city, address, or landmark"
                register={register} 
                errors={errors} 
                required
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                className="absolute right-12 top-8 p-2 rounded-full bg-blue-500 text-white"
                title="Voice input"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {locationValue && locationValue.length > 2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ready to search for:</p>
                    <p className="text-blue-600 font-semibold">"{locationValue}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {step === STEPS.DATE && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">When are you planning to visit?</h2>
              <p className="text-gray-600 text-lg">Select your perfect travel dates</p>
            </div>
            {errorMessage && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-700 font-medium">{errorMessage}</p>
                </div>
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-green-700 font-medium">{successMessage}</p>
                </div>
              </div>
            )}
            <div className="flex justify-center">
              <DateRange
                ranges={[dateRange]}
                onChange={(ranges) => setDateRange(ranges.selection)}
                moveRangeOnFirstSelection={false}
                editableDateInputs={true}
                className="w-full"
                rangeColors={['#3b82f6']}
                color="#3b82f6"
              />
            </div>
            {dateRange.startDate && dateRange.endDate && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                <p className="text-xl font-bold text-blue-600">
                  {dateRange.startDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })} - {dateRange.endDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
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