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
  FiSearch, 
  FiMic, 
  FiMicOff, 
  FiMapPin, 
  FiX, 
  FiLoader,
  FiTrendingUp,
  FiAlertCircle
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

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
}

const SearchModal = () => {
  // Hooks and Refs
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const autocompleteRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Kumasi', 'Accra', 'Takoradi', 'Cape Coast', 'Tamale', 'Ho'
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

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

  // Voice visualization effect
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

  // Load Google Maps scripts
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

  // Initialize Google Places Autocomplete
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
            setShowSuggestions(false);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places:', error);
      }
    }
  }, [scriptsLoaded, setValue]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (searchModal.isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [searchModal.isOpen]);

  // Event Handlers
  const handleClose = useCallback(() => {
    searchModal.onClose();
    setErrorMessage('');
    setSuccessMessage('');
    setIsListening(false);
    setShowSuggestions(true);
    setInputFocused(false);
    reset();
  }, [searchModal, reset]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue('location', suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [setValue]);

  const clearInput = useCallback(() => {
    setValue('location', '');
    setShowSuggestions(true);
    inputRef.current?.focus();
  }, [setValue]);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Voice input is not supported in your browser');
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
      setShowSuggestions(false);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setErrorMessage('Could not recognize speech. Please try again.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setErrorMessage('Voice input failed to start');
      setIsListening(false);
    }
  }, [setValue]);

  const onSubmit = useCallback(
    async (data: any) => {
      if (!data.location?.trim()) {
        setErrorMessage('Please enter a destination');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

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
          setErrorMessage(`No results found for "${data.location}". Try a different location.`);
        }
      } catch (error: any) {
        console.error('Search error:', error);

        if (error.response?.status === 400) {
          const errorData = error.response.data;
          setErrorMessage(errorData.details || 'Invalid search query');
        } else {
          setErrorMessage('Search failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [params, router, handleClose]
  );

  // Voice Visualizer Component
  const VoiceVisualizer = () => (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-blue-500 rounded-full transition-all duration-100"
          style={{
            width: '3px',
            height: `${Math.min(32, Math.max(4, voiceLevel * Math.random() * 0.6 + 8))}px`,
            animationDelay: `${i * 50}ms`
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
      title=""
      actionLabel=""
      disabled={isLoading}
      body={
        <div className="w-full max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <FiMapPin className="w-8 h-8 text-blue-500" />
                <HiSparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Where would you like to go?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Search for cities and destinations
            </p>
          </div>

          {/* Search Input */}
          <div className="relative mb-6">
            <div className={`relative transition-all duration-200 ${
              inputFocused ? 'transform scale-105' : ''
            }`}>
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <FiSearch className="w-5 h-5 text-gray-400" />
              </div>
              
              <input
                ref={inputRef}
                id="location"
                {...register('location', { required: 'Please enter a destination' })}
                placeholder="Enter a city or destination..."
                className={`
                  w-full pl-12 pr-20 py-4 text-lg
                  border-2 rounded-xl transition-all duration-200
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  ${inputFocused || locationValue 
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }
                  ${errors.location ? 'border-red-500' : ''}
                  focus:outline-none focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/20
                `}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => {
                  setValue('location', e.target.value);
                  setShowSuggestions(e.target.value.length === 0);
                  setErrorMessage('');
                }}
              />

              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {locationValue && (
                  <button
                    type="button"
                    onClick={clearInput}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FiX className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  {isListening ? (
                    <FiMicOff className="w-4 h-4" />
                  ) : (
                    <FiMic className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {errors.location && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4" />
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Voice Listening State */}
          {isListening && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex flex-col items-center space-y-4">
                <VoiceVisualizer />
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  Listening... Speak your destination
                </p>
              </div>
            </div>
          )}

          {/* Popular Suggestions */}
          {showSuggestions && !locationValue && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FiTrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Popular destinations
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="
                      p-3 text-left rounded-lg border border-gray-200 dark:border-gray-600
                      hover:border-blue-300 dark:hover:border-blue-500
                      hover:bg-blue-50 dark:hover:bg-blue-900/20
                      transition-all duration-200 transform hover:scale-105
                      bg-white dark:bg-gray-800
                      text-gray-700 dark:text-gray-300
                    "
                  >
                    <span className="text-sm font-medium">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-300 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || !locationValue?.trim()}
            onClick={handleSubmit(onSubmit)}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg
              transition-all duration-200 transform
              ${isLoading || !locationValue?.trim()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <FiSearch className="w-5 h-5" />
                  Search Destinations
                </>
              )}
            </div>
          </button>
        </div>
      }
    />
  );
};

export default SearchModal;