'use client';
import { useEffect, useRef, useState } from 'react';
import { 
  FiCamera, 
  FiRotateCcw, 
  FiCheck, 
  FiVideo, 
  FiVideoOff,
  FiAlertCircle 
} from 'react-icons/fi';

export default function Camera({ onCapture }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [captured, setCaptured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to blob and create preview
    canvas.toBlob(blob => {
      onCapture(blob);
      setCaptured(true);
      
      // Create preview image
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
    }, 'image/jpeg', 0.9);
  };

  const handleRetake = () => {
    setCaptured(false);
    setCapturedImage(null);
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-red-50 border-2 border-red-200 rounded-xl sm:rounded-2xl mx-4 sm:mx-0">
        <FiAlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2 text-center">Camera Access Required</h3>
        <p className="text-red-600 text-center text-xs sm:text-sm mb-3 sm:mb-4 px-2">{error}</p>
        <button
          onClick={startCamera}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-colors duration-200 text-sm sm:text-base"
        >
          <FiVideo className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-md mx-auto">
      {/* Camera Preview */}
      <div className="relative w-full">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gray-900 shadow-lg sm:shadow-2xl aspect-square w-full max-w-sm mx-auto">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
              <div className="flex flex-col items-center text-white">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2 sm:mb-3"></div>
                <p className="text-xs sm:text-sm">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoLoad}
            className={`w-full h-full object-cover ${captured ? 'hidden' : 'block'}`}
            style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie
          />

          {/* Captured Image Preview */}
          {captured && capturedImage && (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          )}

          {/* Camera Overlay Guidelines */}
          {!captured && !isLoading && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Face oval guide - responsive sizing */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-40 sm:w-40 sm:h-52 md:w-48 md:h-64 border-2 sm:border-4 border-white/30 rounded-full backdrop-blur-sm"></div>
              </div>
              
              {/* Corner guides - responsive positioning */}
              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-t-2 border-white/50"></div>
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-t-2 border-white/50"></div>
              <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-b-2 border-white/50"></div>
              <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-b-2 border-white/50"></div>
            </div>
          )}

          {/* Success Overlay */}
          {captured && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-500 text-white p-1.5 sm:p-2 rounded-full shadow-lg">
              <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
        </div>

        {/* Instructions */}
        {!captured && (
          <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border">
            <p className="text-xs text-gray-600 text-center font-medium whitespace-nowrap">
              Position your face in the oval
            </p>
          </div>
        )}
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Action Buttons */}
      <div className="flex justify-center gap-2 sm:gap-4 px-4">
        {!captured ? (
          <button
            onClick={handleCapture}
            disabled={isLoading}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
          >
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-full">
              <FiCamera className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <span className="hidden xs:inline sm:inline">Take Photo</span>
            <span className="xs:hidden sm:hidden">Photo</span>
          </button>
        ) : (
          <div className="flex gap-2 sm:gap-3 w-full max-w-sm">
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base flex-1 sm:flex-none"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Retake</span>
            </button>
            
            <div className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-50 text-green-700 rounded-lg sm:rounded-xl text-sm sm:text-base flex-1 sm:flex-none">
              <div className="p-1 bg-green-100 rounded-full">
                <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <span className="font-medium">Captured</span>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      {!captured && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mx-4 sm:mx-0">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2 text-sm sm:text-base">
            <FiCamera className="w-4 h-4" />
            Photo Tips
          </h4>
          <ul className="text-blue-700 text-xs sm:text-sm space-y-1">
            <li>• Ensure good lighting on your face</li>
            <li>• Look directly at the camera</li>
            <li>• Keep your face centered in the oval</li>
            <li>• Remove sunglasses or hats</li>
          </ul>
        </div>
      )}
    </div>
  );
}