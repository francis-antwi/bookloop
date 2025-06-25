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
  const [listeningTarget, setListeningTarget] = useState<'location' | 'dates' | null>(null);
  const [showMicAnim, setShowMicAnim] = useState(false);
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
    const s1 = document.createElement('script');
    s1.src = 'https://code.responsivevoice.org/responsivevoice.js?key=oMsyTFvN';
    s1.async = true;
    document.body.appendChild(s1);

    const s2 = document.createElement('script');
    s2.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places`;
    s2.async = true;
    document.body.appendChild(s2);

    s1.onload = s2.onload = () => {
      const input = document.getElementById('location') as HTMLInputElement;
      if (window.google && input) {
        const ac = new window.google.maps.places.Autocomplete(input, {
          types: ['(cities)']
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place.formatted_address) {
            setValue('location', place.formatted_address);
            speak(`Wo de ${place.formatted_address}`, 'Twi Female');
          }
        });
      }
    };
  }, [setValue]);

  const speak = (text: string, lang = 'Twi Female') => {
    (window as any).responsiveVoice?.speak(text, lang);
  };

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
    reset();
  }, [searchModal, reset]);

  const handleVoiceInput = (target: 'location' | 'dates') => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Browser does not support speech.');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setListeningTarget(target);
    setShowMicAnim(true);
    setTimeout(() => setShowMicAnim(false), 3000);

    recognition.onstart = () => {
      speak(
        target === 'location'
          ? 'Kasa fa wo kurow ho.'
          : 'Kasa fa wo bere ho. Sɛ yɛka sɛ: from July first to July third.'
      );
    };

    recognition.onresult = (ev: any) => {
      const text = ev.results[0][0].transcript;
      if (target === 'location') {
        setValue('location', text);
        speak(`Woaka sɛ ${text}`, 'Twi Female');
      } else {
        const parsed = chrono.parse(text);
        if (parsed.length > 0) {
          const p = parsed[0];
          setDateRange({
            ...dateRange,
            startDate: p.start.date(),
            endDate: p.end?.date() ?? p.start.date()
          });
          speak(
            `Woapaw bere fi ${p.start.date().toDateString()} kɔ ${ (p.end ?? p.start).date().toDateString() }`,
            'Twi Female'
          );
        } else {
          speak('Memee nte ase. San ka bio.', 'Twi Female');
        }
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      speak('Mesrɛ, san ka bio.', 'Twi Female');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const onSubmit = useCallback(
    async (data: any) => {
      if (step !== STEPS.DATE) {
        return onNext();
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await axios.get('/api/query', { params: { address: data.location } });
        if (res.status === 200) {
          const listing = res.data;
          const currentQ = params ? qs.parse(params.toString()) : {};
          const newQ: any = { ...currentQ, location: listing.address };
          if (dateRange.startDate) newQ.startDate = formatISO(dateRange.startDate);
          if (dateRange.endDate) newQ.endDate = formatISO(dateRange.endDate);

          const url = qs.stringifyUrl({ url: '/', query: newQ }, { skipNull: true });

          setSuccessMessage('Yɛ wiei ara!');
          speak('Yɛ wiei ara!', 'Twi Female');
          setTimeout(() => {
            router.push(url);
            handleClose();
          }, 1500);
        }
      } catch {
        setErrorMessage('Ɛnsɛe, san hyɛ ho bio.');
        speak('Ɛnsɛe, san hyɛ ho bio.', 'Twi Female');
      } finally {
        setIsLoading(false);
      }
    },
    [step, dateRange, params, router, handleClose, onNext]
  );

  const actionLabel = useMemo(() => {
    if (isLoading) return 'Ɛredi...';
    return step === STEPS.DATE ? 'Hwehwɛ' : 'Next';
  }, [step, isLoading]);

  const progressPercentage = ((step + 1) / Object.values(STEPS).length) * 100;

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      title="Hwehwɛ Beae Pa"
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
          {/* Progress */}
          <div className="relative pt-4">
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
              <span className={step >= STEPS.LOCATION ? 'text-blue-600' : 'text-gray-400'}>Location</span>
              <span className={step >= STEPS.DATE ? 'text-blue-600' : 'text-gray-400'}>Dates</span>
            </div>
          </div>

          {/* LOCATION */}
          {step === STEPS.LOCATION && (
            <div className="space-y-6">
              <Input
                id="location"
                label="Destination"
                placeholder="Enter a city or landmark"
                register={register}
                errors={errors}
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => speak(locationValue ? `Wo de ${locationValue}` : 'Fa location no ka')}
                  className="p-2 bg-gray-200 rounded-full"
                >
                  <FaVolumeHigh />
                </button>
                <button
                  type="button"
                  onClick={() => handleVoiceInput('location')}
                  disabled={isListening}
                  className={`p-2 rounded-full ${
                    isListening && listeningTarget === 'location' ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white'
                  }`}
                >
                  <FaMicrophone />
                </button>
              </div>
            </div>
          )}

          {/* DATE */}
          {step === STEPS.DATE && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVoiceInput('dates')}
                  disabled={isListening}
                  className={`p-2 rounded-full ${
                    isListening && listeningTarget === 'dates' ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white'
                  }`}
                >
                  <FaMicrophone />
                </button>
              </div>
              <DateRange
                ranges={[dateRange]}
                onChange={(r) => setDateRange(r.selection)}
                editableDateInputs
                moveRangeOnFirstSelection={false}
                minDate={new Date()}
                className="w-full"
              />
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 text-red-600 p-3 rounded flex items-center gap-2">
              <FaExclamation />
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 text-green-600 p-3 rounded flex items-center gap-2">
              <FaCheck />
              {successMessage}
            </div>
          )}
        </div>
      }
    />
  );
};

export default SearchModal;
