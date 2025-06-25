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
import { DateRange, Range } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import axios from 'axios';
import qs from 'query-string';
import { formatISO } from 'date-fns';
import chrono from 'chrono-node';

import {
  FaLocationDot,
  FaCalendarDays,
  FaCheck,
  FaExclamation,
  FaVolumeHigh,
  FaMicrophone,
  FaMagic,
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
    responsiveVoice: any;
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
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [dateRange, setDateRange] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });
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

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(); // Already loaded
        return;
      }

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
    await loadScript('https://code.responsivevoice.org/responsivevoice.js?key=StbKOKTB');

    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (googleKey) {
      const loader = new Loader({
        apiKey: googleKey,
        version: 'weekly',
        libraries: ['places'],
      });

      await loader.load(); // this loads Google Maps API the proper way
      console.log('Google Maps API loaded successfully');
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
            speak(`✨ Amazing choice! ${place.formatted_address} it is!`, 'UK English Female');
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places:', error);
      }
    }
  }, [scriptsLoaded, setValue, step]);

  const speak = useCallback((text: string, voice = 'UK English Female') => {
  const rv = window?.responsiveVoice;
  if (rv && rv.voiceSupport()) {
    try {
      rv.speak(text, voice, {
        pitch: 1.1,
        rate: 0.9,
        volume: 0.8,
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }
}, []);


  const onBack = useCallback(() => {
    setStep((v) => v - 1);
    setErrorMessage('');
    setSuccessMessage('');
    setShowSuggestions(false);
    setPulseAnimation(true);
    setTimeout(() => setPulseAnimation(false), 600);
  }, []);

  const onNext = useCallback(() => {
    setStep((v) => v + 1);
    setErrorMessage('');
    setSuccessMessage('');
    setShowSuggestions(false);
    setPulseAnimation(true);
    setTimeout(() => setPulseAnimation(false), 600);
    speak('Great! Now let\'s pick your perfect dates! 📅');
  }, [speak]);

  const handleClose = useCallback(() => {
    searchModal.onClose();
    setStep(STEPS.LOCATION);
    setErrorMessage('');
    setSuccessMessage('');
    setIsListening(false);
    setListeningTarget(null);
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
    speak(`Perfect choice! ${suggestion} sounds amazing!`);
  }, [setValue, speak]);

  const handleVoiceInput = useCallback((target: 'location' | 'dates') => {
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
    setListeningTarget(target);
    setShowMicAnim(true);
    setErrorMessage('');

    const micTimer = setTimeout(() => setShowMicAnim(false), 8000);

    recognition.onstart = () => {
      speak(
        target === 'location'
          ? '🌍 I\'m listening! Tell me where your heart wants to go!'
          : '📅 Perfect! Now tell me your dream dates - like "from next Friday to Sunday" or "July 15th to 20th"!'
      );
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      if (target === 'location') {
        setValue('location', transcript);
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 2000);
        speak(`🎯 Got it! "${transcript}" sounds absolutely amazing!`);
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
            
            setShowSparkles(true);
            setTimeout(() => setShowSparkles(false), 2000);
            
            speak(
              `🎉 Perfect timing! ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} - this is going to be epic!`
            );
          } else {
            setErrorMessage('🤔 Hmm, I didn\'t catch those dates. Try saying something like "next weekend" or "July 15th to 20th"');
            speak('Oops! Could you try saying your dates again? Maybe like "next Friday to Sunday"?');
          }
        } catch (error) {
          setErrorMessage('✨ Let\'s try that again! Say your dates like "from Monday to Friday"');
          speak('Let\'s give those dates another shot!');
        }
      }
      
      setIsListening(false);
      setListeningTarget(null);
      clearTimeout(micTimer);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setErrorMessage('🎤 Oops! I didn\'t hear that clearly. Give it another try!');
      speak('Sorry, I missed that! Let\'s try once more!');
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
      setErrorMessage('🎤 Voice input isn\'t working right now. Try typing instead!');
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
        setErrorMessage('🌍 Don\'t forget to tell us where you want to go!');
        speak('Oops! We need to know your destination first!');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      setShowSuggestions(false);

      try {
        const response = await axios.get<ApiResponse>('/api/query', { 
          params: { address: data.location },
          timeout: 10000
        });
        
        // Handle successful response
        if (response.status === 200 && response.data.success && response.data.data) {
          const listing = response.data.data;
          const currentQuery = params ? qs.parse(params.toString()) : {};
          
          const newQuery: any = { 
            ...currentQuery, 
            location: listing.address || data.location,
            locationValue: listing.locationValue,
            listingId: listing.id
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

          setSuccessMessage(`🚀 Woohoo! Found "${listing.title}" in ${listing.address}! Your perfect adventure awaits!`);
          setShowSparkles(true);
          speak(`Amazing! I found ${listing.title} in ${listing.address}! Get ready for an incredible journey!`);
          
          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 2000);
        } else {
          throw new Error('Location not found');
        }
      } catch (error: any) {
        console.error('Search error:', error);
        
        // Handle 404 - location not found with suggestions
        if (error.response?.status === 404) {
          const errorData = error.response.data as ApiResponse;
          setErrorMessage(`🔍 "${data.location}" not found. ${errorData.details || 'Try a different location!'}`);
          
          if (errorData.suggestions && errorData.suggestions.length > 0) {
            setSuggestions(errorData.suggestions);
            setShowSuggestions(true);
            speak(`Hmm, I couldn't find that exact location. But I have some great suggestions for you!`);
          } else {
            speak('Hmm, let\'s try searching for a different location!');
          }
        } 
        // Handle other errors
        else if (error.response?.status === 400) {
          const errorData = error.response.data;
          setErrorMessage(`❌ ${errorData.details || 'Please check your search and try again!'}`);
          speak('Oops, there was an issue with your search. Let\'s try again!');
        }
        else if (error.response?.status === 408) {
          setErrorMessage('⏱️ Search is taking too long. Try a shorter location name!');
          speak('The search is taking a bit long. Let\'s try a shorter location name!');
        }
        else if (error.response?.status === 503) {
          setErrorMessage('🔧 Service temporarily unavailable. Please try again in a moment!');
          speak('Our service is temporarily busy. Let\'s try again in a moment!');
        }
        else {
          setErrorMessage('🔍 Oops! Something went wrong. Let\'s try that search again!');
          speak('Hmm, let\'s try that search one more time!');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [step, dateRange, params, router, handleClose, onNext, speak]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return '✨ Finding Magic...';
    return step === STEPS.DATE ? '🚀 Find My Adventure!' : '✨ Next Step';
  }, [step, isLoading]);

  const progressPercentage = ((step + 1) / Object.keys(STEPS).filter(key => isNaN(Number(key))).length) * 100;

  // Sparkle component - Fixed to always return JSX
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

  // Voice visualizer - Fixed to always return JSX
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

  // Ensure Modal component can handle undefined props
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
            Find Your Dream Destination
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
      secondaryActionLabel={step === STEPS.DATE ? '← Back' : undefined}
      secondaryAction={step === STEPS.DATE ? onBack : undefined}
      disabled={isLoading}
      body={
        <div className="flex flex-col gap-8 relative">
          {showSparkles && <Sparkles />}
          
          {/* Animated Progress Bar */}
          <div className="relative pt-4">
            <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 h-3 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between mt-3 text-sm font-semibold">
              <span className={`flex items-center gap-2 transition-all duration-300 ${
                step >= STEPS.LOCATION ? 'text-blue-600 scale-105' : 'text-gray-400'
              }`}>
                <FaLocationDot className={step >= STEPS.LOCATION ? 'animate-bounce' : ''} />
                Destination
              </span>
              <span className={`flex items-center gap-2 transition-all duration-300 ${
                step >= STEPS.DATE ? 'text-purple-600 scale-105' : 'text-gray-400'
              }`}>
                <FaCalendarDays className={step >= STEPS.DATE ? 'animate-bounce' : ''} />
                Dream Dates
              </span>
            </div>
          </div>

          {/* LOCATION STEP */}
          {step === STEPS.LOCATION && (
            <div className={`space-y-6 transition-all duration-500 ${pulseAnimation ? 'scale-105' : ''}`}>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🌎 Where to Next?
                </h3>
                <p className="text-gray-600 animate-pulse">Tell us your dream destination!</p>
              </div>
              
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
              
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => speak(locationValue ? `🎯 Selected destination: ${locationValue}. Sounds incredible!` : '🌍 Please enter your dream destination first!')}
                  className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  disabled={isListening}
                >
                  <FaVolumeHigh className="text-gray-600 group-hover:animate-pulse" />
                  <span className="font-semibold text-gray-700">🔊 Hear It</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleVoiceInput('location')}
                  disabled={isListening}
                  className={`group flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                    isListening && listeningTarget === 'location' 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse scale-110' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  }`}
                >
                  <FaMicrophone className={isListening && listeningTarget === 'location' ? 'animate-bounce' : 'group-hover:animate-pulse'} />
                  <span className="font-semibold">
                    {isListening && listeningTarget === 'location' ? '🎤 Listening...' : '🎙️ Voice Magic'}
                  </span>
                </button>
              </div>
              
              {isListening && listeningTarget === 'location' && (
                <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 animate-pulse">
                  <VoiceVisualizer />
                  <p className="text-blue-700 font-semibold animate-bounce">🎤 I'm listening for your dream destination...</p>
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
          )}

          {/* DATE STEP */}
          {step === STEPS.DATE && (
            <div className={`space-y-6 transition-all duration-500 ${pulseAnimation ? 'scale-105' : ''}`}>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  📅 Perfect! Now Pick Your Dates
                </h3>
                <p className="text-gray-600">When do you want to explore <span className="font-semibold text-blue-600">{locationValue || 'your destination'}</span>?</p>
                
                <button
                  type="button"
                  onClick={() => handleVoiceInput('dates')}
                  disabled={isListening}
                  className={`group flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mx-auto ${
                    isListening && listeningTarget === 'dates' 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse scale-110' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                  }`}
                >
                  <FaMicrophone className={isListening && listeningTarget === 'dates' ? 'animate-bounce text-xl' : 'group-hover:animate-pulse text-xl'} />
                  <span className="font-bold text-lg">
                    {isListening && listeningTarget === 'dates' ? '🎤 Listening for Dates...' : '🗣️ Tell Me Your Dates'}
                  </span>
                </button>
              </div>
              
              {isListening && listeningTarget === 'dates' && (
                <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 animate-pulse">
                  <VoiceVisualizer />
                  <p className="text-purple-700 font-semibold animate-bounce">📅 Listening for your perfect dates...</p>
                  <p className="text-sm text-purple-600">Try: "from next Friday to Sunday" or "July 15th to 20th"</p>
                </div>
              )}
              
              <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
                <div className="shadow-2xl rounded-2xl overflow-hidden border-4 border-gradient-to-r from-purple-200 to-pink-200">
                  <DateRange
                    ranges={[dateRange]}
                    onChange={(ranges) => {
                      if (ranges.selection) {
                        setDateRange(ranges.selection);
                        setShowSparkles(true);
                        setTimeout(() => setShowSparkles(false), 1500);
                      }
                    }}
                    editableDateInputs={true}
                    moveRangeOnFirstSelection={false}
                    minDate={new Date()}
                    className="border-0"
                  />
                </div>
              </div>
              
              {dateRange.startDate && dateRange.endDate && (
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200 animate-bounce">
                  <p className="text-lg font-bold text-green-700">
                    🎉 Amazing Choice: {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                  </p>
                  <p className="text-green-600 text-sm mt-1">This is going to be an incredible adventure! ✨</p>
                </div>
              )}
            </div>
          )}

          {/* Animated Messages */}
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