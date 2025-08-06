import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, AlertCircle } from 'lucide-react';

interface QuaggaScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

const QuaggaScanner: React.FC<QuaggaScannerProps> = ({ onDetected, onClose }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera not supported on this device');
          setIsLoading(false);
          return;
        }

        // Request camera permission
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permissionError) {
          setError('Camera permission denied. Please allow camera access and try again.');
          setIsLoading(false);
          return;
        }

        if (scannerRef.current) {
          Quagga.init({
            inputStream: {
              type: 'LiveStream',
              target: scannerRef.current,
              constraints: {
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
              },
            },
            decoder: {
              readers: [
                'ean_reader',
                'ean_8_reader',
                'upc_reader',
                'upc_e_reader',
                'code_128_reader',
                'code_39_reader',
                'code_39_vin_reader',
                'codabar_reader',
                'i2of5_reader',
                '2of5_reader',
                'code_93_reader',
              ],
            },
            locate: true,
            frequency: 10,
          }, (err) => {
            if (err) {
              console.error('Quagga init error:', err);
              setError('Failed to initialize camera. Please check permissions and try again.');
              setIsLoading(false);
              return;
            }
            Quagga.start();
            setIsLoading(false);
          });

          Quagga.onDetected(handleDetected);
        }
      } catch (error) {
        console.error('Scanner initialization error:', error);
        setError('Failed to initialize scanner. Please try again.');
        setIsLoading(false);
      }
    };

    initScanner();

    return () => {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDetected = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      onDetected(result.codeResult.code);
      Quagga.stop();
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 lg:p-6 relative w-full max-w-sm lg:max-w-md flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white text-center">Camera Error</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-2 mb-4">
            {error}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 lg:p-6 relative w-full max-w-sm lg:max-w-md flex flex-col items-center">
        <button
          onClick={() => {
            Quagga.stop();
            onClose();
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
        >
          <X className="h-6 w-6" />
        </button>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white text-center">Scan Product Barcode</h3>
        <div 
          ref={scannerRef} 
          className="w-full max-w-xs lg:max-w-sm h-48 lg:h-56 rounded border-2 border-gray-300 dark:border-gray-700 overflow-hidden relative"
          style={{ minHeight: '200px' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300">Initializing camera...</div>
            </div>
          )}
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center px-2">
          Align the barcode within the frame and hold steady.
        </p>
      </div>
    </div>
  );
};

export default QuaggaScanner; 