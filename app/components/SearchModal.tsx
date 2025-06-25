'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef
} from 'react';
import {
  useRouter,
  useSearchParams
} from 'next/navigation';
import { useForm } from 'react-hook-form';
import useSearchModal from '../hooks/useSearchModal';
import Modal from './modals/Modal';
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import axios from 'axios';
import qs from 'query-string';
import { formatISO } from 'date-fns';
import chrono from 'chrono-node';
import Input from './inputs/Input';
import {
  FaLocationDot,
  FaCalendarDays,
  FaCheck,
  FaExclamation,
  FaVolumeHigh,
  FaMicrophone
} from 'react-icons/fa6';
import { IoIosArrowForward } from 'react-icons/io';

// Add proper type definitions
declare global {
  interface Window {
    google: any;
    responsiveVoice: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

enum STEPS {
  LOCATION = 0,
  DATE = 1
}

const SearchModal = () => {
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const autocompleteRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);

  const [step, setStep] = useState(STEPS.LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'location' | 'dates' | null>(null);
  const [showMicAnim, setShowMicAnim] = useState(false);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm();
  const locationValue = watch('location');

  // Load external scripts
  useEffect(() => {
    if (scriptsLoadedRef.current) return;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    const loadScripts = async () => {
      try {
        // Load ResponsiveVoice
        await loadScript('https://code.responsivevoice.org/responsivevoice.js?key=oMsyTFvN');
        
        // Load Google Maps API
        if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
          await loadScript(
            `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places`
          );
        }
        
        scriptsLoadedRef.current = true;
        setScriptsLoaded(true);
      } catch (error) {
        console.error('Error loading scripts:', error);
      }
    };

    loadScripts();
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!scriptsLoaded || !window.google) return;

    const input = document.getElementById('location') as HTMLInputElement;
    if (input && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          types: ['(cities)']
        });
        
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setValue('location', place.formatted_address);
            speak(`Selected ${place.formatted_address}`, 'UK English Female');
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places:', error);
      }
    }
  }, [scriptsLoaded, setValue, step]); // Add step dependency to reinitialize when modal reopens

  const speak = useCallback((text: string, voice = 'UK English Female') => {
    if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
      window.responsiveVoice.speak(text, voice);
    }
  }, []);

  const onBack = useCallback(() => {
    setStep((v) => v - 1);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const onNext = useCallback(() => {
    setStep((v) => v + 1);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleClose = useCallback(() => {
    searchModal.onClose();
    setStep(STEPS.LOCATION);
    setErrorMessage('');
    setSuccessMessage('');
    setIsListening(false);
    setListeningTarget(null);
    reset();
  }, [searchModal, reset]);

  const handleVoiceInput = useCallback((target: 'location' | 'dates') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setListeningTarget(target);
    setShowMicAnim(true);
    setErrorMessage('');

    const micTimer = setTimeout(() => setShowMicAnim(false), 3000);

    recognition.onstart = () => {
      speak(
        target === 'location'
          ? 'Please tell me your destination'
          : 'Please tell me your travel dates, for example: from July first to July third'
      );
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      if (target === 'location') {
        setValue('location', transcript);
        speak(`You said ${transcript}`);
      } else if (target === 'dates') {
        try {
          const parsed = chrono.parse(transcript);
          if (parsed.length > 0) {
            const result = parsed[0];
            const startDate = result.start.date();
            const endDate = result.end ? result.end.date() : startDate;
            
            setDateRange({
              ...dateRange,
              startDate,
              endDate
            });
            
            speak(
              `Selected dates from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
            );
          } else {
            setErrorMessage('Could not understand the dates. Please try again.');
            speak('I could not understand the dates. Please try again.');
          }
        } catch (error) {
          setErrorMessage('Error parsing dates. Please try again.');
          speak('Error parsing dates. Please try again.');
        }
      }
      
      setIsListening(false);
      setListeningTarget(null);
      clearTimeout(micTimer);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setErrorMessage('Speech recognition error. Please try again.');
      speak('Sorry, there was an error. Please try again.');
      setIsListening(false);
      setListeningTarget(null);
      clearTimeout(micTimer);
    };

    recognition.onend = () => {
      setIsListening(false);
      setListeningTarget(null);
      clearTimeout(micTimer);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setErrorMessage('Could not start voice recognition.');
      setIsListening(false);
      setListeningTarget(null);
      clearTimeout(micTimer);
    }
  }, [dateRange, setValue, speak]);

  const onSubmit = useCallback(
    async (data: any) => {
      if (step !== STEPS.DATE) {
        return onNext();
      }

      if (!data.location) {
        setErrorMessage('Please enter a location.');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      try {
        const response = await axios.get('/api/query', { 
          params: { address: data.location },
          timeout: 10000 // 10 second timeout
        });
        
        if (response.status === 200 && response.data) {
          const listing = response.data;
          const currentQuery = params ? qs.parse(params.toString()) : {};
          
          const newQuery: any = { 
            ...currentQuery, 
            location: listing.address || data.location 
          };
          
          if (dateRange.startDate) {
            newQuery.startDate = formatISO(dateRange.startDate);
          }
          if (dateRange.endDate) {
            newQuery.endDate = formatISO(dateRange.endDate);
          }

          const url = qs.stringifyUrl(
            { url: '/', query: newQuery }, 
            { skipNull: true }
          );

          setSuccessMessage('Search completed successfully!');
          speak('Search completed successfully!');
          
          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 1500);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Search error:', error);
        setErrorMessage('Search failed. Please try again.');
        speak('Search failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [step, dateRange, params, router, handleClose, onNext, speak]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return 'Searching...';
    return step === STEPS.DATE ? 'Search' : 'Next';
  }, [step, isLoading]);

  const progressPercentage = ((step + 1) / Object.keys(STEPS).filter(key => isNaN(Number(key))).length) * 100;

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      title="Find Your Perfect Destination"
      actionLabel={
        <div className="flex items-center gap-2">
          {actionLabel}
          {!isLoading && <IoIosArrowForward />}
        </div>
      }
      secondaryActionLabel={step === STEPS.DATE ? 'Back' : undefined}
      secondaryAction={step === STEPS.DATE ? onBack : undefined}
      disabled={isLoading}
      body={
        <div className="flex flex-col gap-8">
          {/* Progress Bar */}
          <div className="relative pt-4">
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
              <span className={step >= STEPS.LOCATION ? 'text-blue-600' : 'text-gray-400'}>
                <FaLocationDot className="inline mr-1" />
                Location
              </span>
              <span className={step >= STEPS.DATE ? 'text-blue-600' : 'text-gray-400'}>
                <FaCalendarDays className="inline mr-1" />
                Dates
              </span>
            </div>
          </div>

          {/* LOCATION STEP */}
          {step === STEPS.LOCATION && (
            <div className="space-y-6">
              <div className="relative">
                <Input
                  id="location"
                  label="Where would you like to go?"
                  placeholder="Enter a city, country, or landmark"
                  register={register}
                  errors={errors}
                  required
                />
                {locationValue && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FaLocationDot className="text-blue-500" />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => speak(locationValue ? `Selected destination: ${locationValue}` : 'Please enter a destination')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isListening}
                >
                  <FaVolumeHigh className="text-gray-600" />
                  <span className="text-sm">Speak</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleVoiceInput('location')}
                  disabled={isListening}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isListening && listeningTarget === 'location' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <FaMicrophone />
                  <span className="text-sm">
                    {isListening && listeningTarget === 'location' ? 'Listening...' : 'Voice Input'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* DATE STEP */}
          {step === STEPS.DATE && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Select Your Travel Dates</h3>
                <p className="text-gray-600 text-sm mb-4">Choose when you'd like to visit {locationValue}</p>
                
                <button
                  type="button"
                  onClick={() => handleVoiceInput('dates')}
                  disabled={isListening}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mx-auto ${
                    isListening && listeningTarget === 'dates' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <FaMicrophone />
                  <span className="text-sm">
                    {isListening && listeningTarget === 'dates' ? 'Listening...' : 'Voice Input'}
                  </span>
                </button>
              </div>
              
              <div className="flex justify-center">
                <DateRange
                  ranges={[dateRange]}
                  onChange={(ranges) => setDateRange(ranges.selection)}
                  editableDateInputs={true}
                  moveRangeOnFirstSelection={false}
                  minDate={new Date()}
                  className="border rounded-lg"
                />
              </div>
              
              {dateRange.startDate && dateRange.endDate && (
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Selected: {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
              <FaExclamation className="text-red-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-3">
              <FaCheck className="text-green-500 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          
          {showMicAnim && (
            <div className="text-center">
              <div className="inline-block animate-bounce">
                <FaMicrophone className="text-2xl text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 mt-2">Listening...</p>
            </div>
          )}
        </div>
      }
    />
  );
};

export default SearchModal;