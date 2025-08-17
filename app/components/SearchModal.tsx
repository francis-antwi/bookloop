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
import axios from 'axios';
import qs from 'query-string';
import { Loader } from '@googlemaps/js-api-loader';
import Modal from './modals/Modal';
import Input from './inputs/Input';

// Icons
import {
  FaLocationDot,
  FaCheck,
  FaExclamationCircle,
  FaSearch,
} from 'react-icons/fa';
import { FaMicrophone, FaCompass } from 'react-icons/fa6';
import { FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { BiError } from 'react-icons/bi';

// Add proper type definitions
declare global {
  interface Window {
    google: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Type definitions to match the API response
interface ApiResponse {
  success: boolean;
  data?: {
    id: string;
    address: string;
    title: string;
    category: string;
    locationValue: string;
  };
  message?: string;
  suggestions?: string[];
  searchQuery?: string;
  normalizedQuery?: string;
  matchType?: string;
  details?: string;
  listings?: any[];
}

const SearchModal = () => {
  // Hooks and Refs
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const autocompleteRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);

  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form Handling
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm();
  const locationValue = watch('location');

  // Effects
  useEffect(() => {
    let animationFrame: number;
    if (isListening) {
      const animate = () => {
        setVoiceLevel(Math.random() * 100);
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    }
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (scriptsLoadedRef.current) return;

    const loadScripts = async () => {
      try {
        const googleKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (googleKey) {
          const loader = new Loader({
            apiKey: googleKey,
            version: 'weekly',
            libraries: ['places'],
          });

          await loader.load();
        }

        scriptsLoadedRef.current = true;
        setScriptsLoaded(true);
      } catch (error) {
        console.error('Error loading scripts:', error);
        setScriptsLoaded(true);
      }
    };

    loadScripts();
  }, []);

  useEffect(() => {
    if (!scriptsLoaded || !window.google?.maps?.places) return;

    const input = document.getElementById('location') as HTMLInputElement;
    if (input && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          types: ['(cities)']
        });
        
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place?.formatted_address) {
            setValue('location', place.formatted_address);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places:', error);
      }
    }
  }, [scriptsLoaded, setValue]);

  // Event Handlers
  const handleClose = useCallback(() => {
    searchModal.onClose();
    setErrorMessage('');
    setSuccessMessage('');
    setIsListening(false);
    setShowSuggestions(false);
    setSuggestions([]);
    reset();
  }, [searchModal, reset]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue('location', suggestion);
    setShowSuggestions(false);
  }, [setValue]);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Your browser does not support voice input. Please try typing instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setErrorMessage('');

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setValue('location', transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setErrorMessage('I couldn\'t hear that. Please try again.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setErrorMessage('Voice input is not available right now. Please try typing instead.');
      setIsListening(false);
    }
  }, [setValue]);

  const onSubmit = useCallback(
    async (data: any) => {
      if (!data.location) {
        setErrorMessage('Please enter a location to begin your search.');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      setShowSuggestions(false);

      try {
        const response = await axios.get<ApiResponse>('/api/query', {
          params: { address: data.location },
          timeout: 10000,
        });

        const listings = response.data.listings;

        if (
          response.status === 200 &&
          response.data.success &&
          Array.isArray(listings) &&
          listings.length > 0
        ) {
          const normalizedLocation = data.location
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-');

          router.push(`/search/${normalizedLocation}`);
          handleClose();
        } else {
          setErrorMessage(`No listings found for "${data.location}". Try a different location or check your spelling.`);
        }
      } catch (error: any) {
        console.error('Search error:', error);

        if (error.response?.status === 400) {
          const errorData = error.response.data;
          setErrorMessage(`Error: ${errorData.details || 'Invalid input'}`);
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [params, router, handleClose]
  );

  // Memoized Values
  const actionLabel = useMemo(() => {
    if (isLoading) return 'Searching...';
    return 'Start your Adventure';
  }, [isLoading]);

  // Components
  const VoiceVisualizer = () => (
    <div className="flex items-center justify-center gap-1 h-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-gold-500 rounded-full transition-all duration-75"
          style={{
            width: '4px',
            height: `${Math.min(24, Math.max(4, voiceLevel * Math.random() * 0.8))}px`,
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
  );

  if (!searchModal || typeof searchModal.isOpen !== 'boolean') {
    return null;
  }

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      title={
        <div className="flex items-center gap-2">
          <FaCompass className="text-gold-500" />
          <span className="text-gray-800 dark:text-gray-200 font-medium tracking-wide">
            Find Your Destination
          </span>
        </div>
      }
      actionLabel={
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="animate-spin">
              <FaSearch />
            </div>
          ) : (
            <FaCompass className="text-lg" />
          )}
          <span>{actionLabel}</span>
          {!isLoading && (
            <FiChevronRight className="transition-transform duration-300 transform group-hover:translate-x-1" />
          )}
        </div>
      }
      disabled={isLoading}
      body={
        <div className="flex flex-col gap-6 font-inter">
          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Where will your journey take you?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Search for cities, towns, or neighborhoods to find your next stay.
            </p>
          </div>
          
          <div className="relative">
            <Input
              id="location"
              label="Location"
              placeholder="e.g., Kumasi, Accra, Takoradi..."
              register={register}
              errors={errors}
              required
            />
            {locationValue && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <FaLocationDot />
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isListening}
              className={`
                group flex items-center gap-2 px-4 py-2 rounded-lg 
                transition-all duration-300 transform hover:scale-105
                shadow-sm hover:shadow-md
                text-sm font-medium
                ${
                  isListening 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
              `}
            >
              <FaMicrophone className={isListening ? 'animate-pulse' : ''} />
              <span>
                {isListening ? 'Listening...' : 'Voice Search'}
              </span>
            </button>
          </div>
          
          {isListening && (
            <div className="flex flex-col items-center space-y-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <VoiceVisualizer />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Listening for your location...
              </p>
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FiChevronDown className="text-gold-500" />
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                  Popular Searches
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="
                      bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                      hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md p-2 text-left 
                      transition-all duration-200 transform hover:scale-105 
                      text-sm
                    "
                  >
                    <span className="text-gray-600 dark:text-gray-400">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg flex items-center gap-3 animate-fade-in">
              <BiError className="text-red-500 flex-shrink-0 text-xl" />
              <span className="font-medium text-sm">{errorMessage}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg flex items-center gap-3 animate-fade-in">
              <FaCheck className="text-green-500 flex-shrink-0 text-xl" />
              <span className="font-medium text-sm">{successMessage}</span>
            </div>
          )}
        </div>
      }
    />
  );
};

export default SearchModal;