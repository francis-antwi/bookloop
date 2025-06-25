'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState
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

enum STEPS {
  LOCATION = 0,
  DATE = 1
}

const SearchModal = () => {
  const searchModal = useSearchModal();
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(STEPS.LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMicrophoneAnimation, setShowMicrophoneAnimation] = useState(false);
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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=oMsyTFvN';
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

          const updateQuery: any = {
            ...currentQuery,
            location: listing?.address
          };

          if (dateRange.startDate) updateQuery.startDate = formatISO(dateRange.startDate);
          if (dateRange.endDate) updateQuery.endDate = formatISO(dateRange.endDate);

          const url = qs.stringifyUrl({ url: '/', query: updateQuery }, { skipNull: true });

          setSuccessMessage('Search completed successfully!');
          (window as any).responsiveVoice?.speak('Search completed successfully!');

          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 1500);
        }
      } catch (error) {
        setErrorMessage('Location not found. Please try a different location.');
        (window as any).responsiveVoice?.speak('Location not found. Please try a different one.');
      } finally {
        setIsLoading(false);
      }
    },
    [step, onNext, params, dateRange, router, handleClose]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return 'Searching...';
    return step === STEPS.DATE ? 'Search' : 'Next';
  }, [step, isLoading]);

  const progressPercentage = ((step + 1) / Object.values(STEPS).length) * 100;

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support voice recognition.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setShowMicrophoneAnimation(true);
    setTimeout(() => setShowMicrophoneAnimation(false), 3000);

    recognition.onstart = () => {
      (window as any).responsiveVoice?.speak('Listening. Please say your destination.');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setValue('location', transcript, { shouldValidate: true });
      (window as any).responsiveVoice?.speak(`You said ${transcript}. You can press Next to continue.`);
      setIsListening(false);
    };

    recognition.onerror = () => {
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
      {/* Progress bar */}
      <div className="relative pt-4">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-medium">
          <span className={step >= STEPS.LOCATION ? 'text-blue-600' : 'text-gray-400'}>Location</span>
          <span className={step >= STEPS.DATE ? 'text-blue-600' : 'text-gray-400'}>Dates</span>
        </div>
      </div>

      {/* Location Step */}
      {step === STEPS.LOCATION && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Where would you like?
            </h2>
            <p className="text-gray-500">Discover amazing places around Ghana</p>
          </div>

          <div className="relative">
            <Input
              id="location"
              label="Destination"
              placeholder="Enter a city, address, or landmark"
              register={register}
              errors={errors}
              required
              className="text-lg pr-24 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-300"
            />
            <div className="absolute right-2 top-9 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  (window as any).responsiveVoice?.speak(locationValue ? `You entered ${locationValue}` : 'Please enter a location first')
                }
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <FaVolumeHigh className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isListening}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isListening || showMicrophoneAnimation
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <FaMicrophone className="w-4 h-4" />
              </button>
            </div>

            {showMicrophoneAnimation && (
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-red-500/10 rounded-full animate-ping pointer-events-none"></div>
            )}
          </div>

          {locationValue && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <FaLocationDot className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">You're searching for:</p>
                <p className="text-blue-600 font-semibold">"{locationValue}"</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date Step */}
      {step === STEPS.DATE && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              What is your schedule?
            </h2>
            <p className="text-gray-500">Select your preferred dates</p>
          </div>

          {isListening && (
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-gray-100 animate-fadeIn">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                  <FaMicrophone className="text-white text-sm" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Voice Recognition Active</p>
                  <p className="text-xs text-gray-500">Say your check-in and check-out dates</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-4 w-1 bg-blue-500 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full mt-0.5">
                <FaExclamation className="text-red-600" />
              </div>
              <p className="text-red-600 font-medium">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-full mt-0.5">
                <FaCheck className="text-green-600" />
              </div>
              <p className="text-green-600 font-medium">{successMessage}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <DateRange
              ranges={[dateRange]}
              onChange={(ranges) => setDateRange(ranges.selection)}
              moveRangeOnFirstSelection={false}
              editableDateInputs={true}
              className="w-full"
              minDate={new Date()}
            />

            <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4">
              <div>
                <p className="text-sm text-gray-500">Selected dates</p>
                <p className="font-medium">
                  {dateRange.startDate?.toLocaleDateString()} - {dateRange.endDate?.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-1 rounded-full">
                <FaCalendarDays className="text-blue-600" />
                <span className="text-blue-600">
                  {Math.ceil(
                    ((dateRange.endDate?.getTime() ?? 0) - (dateRange.startDate?.getTime() ?? 0)) /
                      (1000 * 60 * 60 * 24)
                  ) || 1}{' '}
                  night(s)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      title="Find Your Perfect listing"
      actionLabel={
        <div className="flex items-center justify-center gap-2">
          {actionLabel}
          {!isLoading && <IoIosArrowForward />}
        </div>
      }
      secondaryActionLabel={step === STEPS.DATE ? 'Back' : undefined}
      secondaryAction={step === STEPS.DATE ? onBack : undefined}
      body={bodyContent}
      disabled={isLoading}
    />
  );
};

export default SearchModal;
