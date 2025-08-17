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

// Type definitions
declare global {
  interface Window {
    google: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const autocompleteRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue
  } = useForm();
  const locationValue = watch('location');

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

  const actionLabel = useMemo(() => {
    if (isLoading) return 'Searching...';
    return 'Start Your Adventure';
  }, [isLoading]);

  const VoiceVisualizer = () => (
    <div className="flex items-center justify-center gap-1.5 h-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-indigo-500 rounded-full transition-all duration-100 ease-in-out"
          style={{
            width: '5px',
            height: `${Math.min(24, Math.max(6, voiceLevel * Math.random() * 0.9))}px`,
            animation: `pulse ${0.3 + i * 0.1}s ease-in-out infinite alternate`
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
        <div className="flex items-center gap-3">
          <FaCompass className="text-indigo-600 text-xl" />
          <span className="text-gray-900 text-lg font-semibold tracking-tight">
            Find Your Destination
          </span>
        </div>
      }
      actionLabel={
        <div className="flex items-center gap-2.5 font-medium">
          {isLoading ? (
            <div className="animate-spin text-indigo-600">
              <FaSearch />
            </div>
          ) : (
            <FaCompass className="text-indigo-600 text-lg" />
          )}
          <span className="text-white">{actionLabel}</span>
          {!isLoading && (
            <FiChevronRight className="text-white transition-transform duration-300 group-hover:translate-x-1.5" />
          )}
        </div>
      }
      disabled={isLoading}
      body={
        <div className="flex flex-col gap-6 p-2 font-sans">
          <div className="space-y-2 text-center">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
              Where will your journey take you?
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
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
              className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl py-3 px-4"
            />
            {locationValue && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500">
                <FaLocationDot className="text-lg" />
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isListening}
              className={`
                group flex items-center gap-2.5 px-5 py-2.5 rounded-xl
                transition-all duration-300 hover:scale-105
                shadow-sm hover:shadow-lg
                text-sm font-medium
                ${isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }
              `}
            >
              <FaMicrophone className={isListening ? 'animate-pulse' : ''} />
              <span>{isListening ? 'Listening...' : 'Voice Search'}</span>
            </button>
          </div>

          {isListening && (
            <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-xl shadow-sm">
              <VoiceVisualizer />
              <p className="text-gray-600 text-sm font-medium">
                Listening for your location...
              </p>
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <FiChevronDown className="text-indigo-600 text-lg" />
                <h4 className="font-semibold text-gray-800 text-base">
                  Popular Searches
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="
                      bg-gray-50 border border-gray-200
                      hover:bg-indigo-50 hover:border-indigo-300
                      rounded-lg p-2.5 text-left
                      transition-all duration-200 hover:scale-102
                      text-sm font-medium text-gray-700
                    "
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in duration-300">
              <BiError className="text-red-600 text-xl flex-shrink-0" />
              <span className="font-medium text-sm leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in duration-300">
              <FaCheck className="text-green-600 text-xl flex-shrink-0" />
              <span className="font-medium text-sm leading-relaxed">{successMessage}</span>
            </div>
          )}
        </div>
      }
      className="max-w-lg mx-auto rounded-2xl shadow-xl bg-white"
      actionButtonClassName="
        bg-indigo-600 hover:bg-indigo-700
        text-white font-medium
        rounded-xl px-6 py-3
        transition-all duration-300
        group hover:shadow-lg
      "
    />
  );
};

export default SearchModal;