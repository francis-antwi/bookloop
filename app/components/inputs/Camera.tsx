'use client';
import { useEffect, useRef, useState } from 'react';
import { 
  FiCamera, 
  FiRotateCcw, 
  FiCheck, 
  FiVideo, 
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
          width: { ideal: 480 },
          height: { ideal: 480 },
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
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      onCapture?.(blob);
      setCaptured(true);
      
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg mx-2">
        <FiAlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <h3 className="text-sm font-semibold text-red-700 mb-1 text-center">Camera Access Required</h3>
        <p className="text-red-600 text-center text-xs mb-3">{error}</p>
        <button
          onClick={startCamera}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          <FiVideo className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs mx-auto space-y-3 p-2">
      {/* Camera Preview */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-lg bg-gray-900 shadow-lg aspect-square w-full">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80">
              <div className="flex flex-col items-center text-white">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsLoading(false)}
            className={`w-full h-full object-cover ${captured ? 'hidden' : 'block'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Captured Image Preview */}
          {captured && capturedImage && (
            <img
              src={capturedImage}
              alt="Captured selfie"
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}

          {/* Camera Guidelines */}
          {!captured && !isLoading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-24 h-32 xs:w-28 xs:h-36 sm:w-32 sm:h-40 border-2 border-white/40 rounded-full"></div>
            </div>
          )}

          {/* Success Icon */}
          {captured && (
            <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full">
              <FiCheck className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Instructions */}
        {!captured && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-full shadow-md border text-center">
            <p className="text-xs text-gray-600 font-medium whitespace-nowrap">
              Position face in oval
            </p>
          </div>
        )}
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action Buttons */}
      <div className="flex justify-center gap-2">
        {!captured ? (
          <button
            onClick={handleCapture}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
          >
            <FiCamera className="w-4 h-4" />
            <span className="hidden xs:inline">Take Photo</span>
            <span className="xs:hidden">Photo</span>
          </button>
        ) : (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm flex-1"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Retake</span>
            </button>
            
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm flex-1">
              <FiCheck className="w-4 h-4" />
              <span className="font-medium">Captured</span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Tips */}
      {!captured && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FiCamera className="w-3 h-3 text-blue-600" />
            <h4 className="font-medium text-blue-800 text-xs">Tips</h4>
          </div>
          <ul className="text-blue-700 text-xs space-y-0.5">
            <li>• Good lighting on face</li>
            <li>• Look at camera</li>
            <li>• Center face in oval</li>
          </ul>
        </div>
      )}
    </div>
  );
}