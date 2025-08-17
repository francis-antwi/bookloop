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
import { FaMagic } from "react-icons/fa";
import {
  FaLocationDot,
  FaCheck,
  FaExclamation,
  FaMicrophone,
  FaRocket,
  FaLightbulb
} from 'react-icons/fa6';
import { IoIosArrowForward } from 'react-icons/io';
import { Loader } from '@googlemaps/js-api-loader';
import Modal from './modals/Modal';
import Input from './inputs/Input';

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
}

const SearchModal = () => {
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();
  const autocompleteRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMicAnim, setShowMicAnim] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
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

  // Load external scripts with better error handling
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

  // Initialize Google Places Autocomplete with better error handling
  useEffect(() => {
    if (!scriptsLoaded || !window.google || !window.google.maps || !window.google.maps.places) return;

    const input = document.getElementById('location') as HTMLInputElement;
    if (input && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
          types: ['(cities)']
        });
        
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place && place.formatted_address) {
            setValue('location', place.formatted_address);
            setShowSparkles(true);
            setTimeout(() => setShowSparkles(false), 2000);
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
    setShowSparkles(false);
    setPulseAnimation(false);
    setShowSuggestions(false);
    setSuggestions([]);
    reset();
  }, [searchModal, reset]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue('location', suggestion);
    setShowSuggestions(false);
    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 2000);
  }, [setValue]);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('🎤 Oops! Your browser doesn\'t support voice input. Try typing instead!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setShowMicAnim(true);
    setErrorMessage('');

    const micTimer = setTimeout(() => setShowMicAnim(false), 8000);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setValue('location', transcript);
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 2000);
      setIsListening(false);
      clearTimeout(micTimer);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setErrorMessage('🎤 Oops! I didn\'t hear that clearly. Give it another try!');
      setIsListening(false);
      clearTimeout(micTimer);
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(micTimer);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setErrorMessage('Voice input isn\'t working right now. Try typing instead!');
      setIsListening(false);
      clearTimeout(micTimer);
    }
  }, [setValue]);

  const onSubmit = useCallback(
    async (data: any) => {
      if (!data.location) {
        setErrorMessage('🌍 Don\'t forget to tell us where you want to go!');
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
          setErrorMessage(`🔍 "${data.location}" not found. Try a different location or check your spelling.`);
        }
      } catch (error: any) {
        console.error('Search error:', error);

        if (error.response?.status === 400) {
          const errorData = error.response.data;
          setErrorMessage(`❌ ${errorData.details || 'Invalid input'}`);
        } else {
          setErrorMessage('🔍 Oops! Something went wrong.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [params, router, handleClose]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return '✨ Finding Magic...';
    return '🚀 Find My Adventure!';
  }, [isLoading]);

  // Sparkle component
  const Sparkles = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: '1.5s'
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );

  // Voice visualizer
  const VoiceVisualizer = () => (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-75"
          style={{
            width: '4px',
            height: `${Math.min(48, Math.max(4, voiceLevel * Math.random() * 0.8))}px`,
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
        <div className="flex items-center gap-2 relative">
          <FaMagic className="text-purple-500 animate-spin" />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
            Find your desired listing
          </span>
          {showSparkles && <Sparkles />}
        </div>
      }
      actionLabel={
        <div className={`flex items-center gap-2 transition-all duration-300 ${pulseAnimation ? 'scale-110' : ''}`}>
          {isLoading ? <div className="animate-spin">🌟</div> : <FaRocket className="animate-bounce" />}
          {actionLabel}
          {!isLoading && <IoIosArrowForward className="animate-pulse" />}
        </div>
      }
      disabled={isLoading}
      body={
        <div className="flex flex-col gap-8 relative">
          {showSparkles && <Sparkles />}
          
          <div className={`space-y-6 transition-all duration-500 ${pulseAnimation ? 'scale-105' : ''}`}>
            {/* Header Section */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🌎 Where to Next?
              </h3>
              <p className="text-gray-600 animate-pulse">Find your listing location!</p>
            </div>
            
            {/* Input Section */}
            <div className="relative group">
              <Input
                id="location"
                label=""
                placeholder="✈️ Type a magical place... Kumasi, Accra, Takoradi..."
                register={register}
                errors={errors}
                required
              />
              {locationValue && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <FaLocationDot className="text-green-500 animate-bounce text-xl" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
            
            {/* Voice Input Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isListening}
                className={`group flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  isListening 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse scale-110' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                }`}
              >
                <FaMicrophone className={isListening ? 'animate-bounce' : 'group-hover:animate-pulse'} />
                <span className="font-semibold">
                  {isListening ? 'Listening...' : 'Voice Input'}
                </span>
              </button>
            </div>
            
            {/* Voice Visualizer */}
            {isListening && (
              <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 animate-pulse">
                <VoiceVisualizer />
                <p className="text-blue-700 font-semibold animate-bounce">🎤 I'm listening for your location...</p>
              </div>
            )}

            {/* Suggestions Section */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <FaLightbulb className="text-yellow-500 animate-bounce" />
                  <h4 className="font-bold text-yellow-700">💡 How about these amazing places?</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="bg-white hover:bg-yellow-100 border border-yellow-300 hover:border-yellow-400 rounded-lg p-3 text-left transition-all duration-200 transform hover:scale-105 hover:shadow-md group"
                    >
                      <span className="font-semibold text-gray-700 group-hover:text-yellow-700">
                        🏖️ {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-shake">
              <FaExclamation className="text-red-500 flex-shrink-0 animate-bounce text-xl" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-bounce">
              <FaCheck className="text-green-500 flex-shrink-0 animate-pulse text-xl" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}
        </div>
      }
    />
  );
};

export default SearchModal;