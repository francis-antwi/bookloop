import React, { useState, useRef, useEffect } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

const ImprovedCamera = ({ onCapture }: { onCapture: (blob: Blob) => void }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };
  
  // Clean up the camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        addDebugInfo('Camera stream cleaned up');
      }
    };
  }, [stream]);
  
  const startCamera = async () => {
    try {
      setCameraError(null);
      addDebugInfo('Requesting camera access...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      addDebugInfo('Calling getUserMedia...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      addDebugInfo('Camera stream obtained successfully');
      
      setStream(mediaStream);
      setIsCameraActive(true);
      
      // Wait for the next render cycle to ensure video element is available
      setTimeout(() => {
        if (videoRef.current) {
          addDebugInfo('Setting video source...');
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            addDebugInfo('Video metadata loaded, starting playback...');
            videoRef.current?.play().then(() => {
              addDebugInfo('Video playback started successfully');
            }).catch(err => {
              const errorMsg = `Error playing video: ${err.message}`;
              console.error(errorMsg, err);
              setCameraError(errorMsg);
              addDebugInfo(errorMsg);
            });
          };
          
          videoRef.current.onerror = (err) => {
            const errorMsg = 'Video element error';
            console.error(errorMsg, err);
            setCameraError(errorMsg);
            addDebugInfo(errorMsg);
          };
        }
      }, 100);
    } catch (error: any) {
      const errorMsg = `Camera access error: ${error.message}`;
      console.error(errorMsg, error);
      addDebugInfo(errorMsg);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('Camera is being used by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setCameraError('Camera constraints not supported.');
      } else {
        setCameraError(`Camera error: ${error.message}`);
      }
    }
  };
  
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        addDebugInfo(`Stopped track: ${track.kind}`);
      });
      setStream(null);
      setIsCameraActive(false);
      setCameraError(null);
      addDebugInfo('Camera stopped');
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current || !stream) {
      addDebugInfo('Cannot capture: missing video or stream');
      return;
    }
    
    setIsCapturing(true);
    addDebugInfo('Starting photo capture...');
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      addDebugInfo('Failed to get canvas context');
      return;
    }
    
    ctx.drawImage(videoRef.current, 0, 0);
    addDebugInfo(`Photo drawn to canvas: ${canvas.width}x${canvas.height}`);
    
    canvas.toBlob((blob) => {
      if (blob) {
        addDebugInfo(`Photo blob created: ${blob.size} bytes`);
        onCapture(blob);
        stopCamera();
      } else {
        addDebugInfo('Failed to create photo blob');
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.8);
  };
  
  const checkCameraSupport = () => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    addDebugInfo(`Camera API supported: ${supported}`);
    return supported;
  };
  
  useEffect(() => {
    checkCameraSupport();
    addDebugInfo(`User agent: ${navigator.userAgent.substring(0, 100)}...`);
  }, []);
  
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      {!isCameraActive ? (
        <div className="text-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Camera className="text-gray-400 text-3xl" />
          </div>
          
          {cameraError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 text-sm font-medium">Camera Error</p>
                  <p className="text-red-700 text-xs mt-1">{cameraError}</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={startCamera}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-4"
          >
            Open Camera
          </button>
          
          {/* Debug Information */}
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-600 cursor-pointer">Debug Info</summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-gray-700">{info}</div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="relative mx-auto max-w-sm">
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              autoPlay
              playsInline
              muted
              style={{ height: '240px', objectFit: 'cover' }}
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white p-4 rounded-lg">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-2" />
                  <p className="text-sm">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              disabled={isCapturing || !!cameraError}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {isCapturing ? 'Capturing...' : 'Take Photo'}
            </button>
          </div>
          
          {/* Debug Information */}
          <details className="text-left">
            <summary className="text-sm text-gray-600 cursor-pointer">Debug Info</summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-gray-700">{info}</div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ImprovedCamera;