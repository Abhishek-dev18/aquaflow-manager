/**
 * Custom Alert Modal Component
 * Displays centered popup alerts matching the website UI
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type AlertType = 'error' | 'success' | 'info';

interface AlertProps {
  message: string;
  type?: AlertType;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

const Alert: React.FC<AlertProps> = ({ 
  message, 
  type = 'error', 
  onClose, 
  autoClose = true,
  autoCloseDuration = 4000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDuration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible) return null;

  const bgColor = type === 'error' ? 'bg-red-50 border-red-200' : type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
  const textColor = type === 'error' ? 'text-red-800' : type === 'success' ? 'text-green-800' : 'text-blue-800';
  const buttonColor = type === 'error' ? 'hover:bg-red-100' : type === 'success' ? 'hover:bg-green-100' : 'hover:bg-blue-100';
  const iconColor = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`${bgColor} border-2 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in slide-in-from-bottom-4 duration-300 relative`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${buttonColor}`}
        >
          <X size={20} className={iconColor} />
        </button>

        {/* Icon and Message */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {type === 'error' && <AlertCircle size={32} className={iconColor} />}
            {type === 'success' && <CheckCircle size={32} className={iconColor} />}
            {type === 'info' && <Info size={32} className={iconColor} />}
          </div>
          <div className="flex-1">
            <p className={`${textColor} font-semibold text-lg leading-relaxed break-words`}>
              {message}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`w-full mt-6 py-2 px-4 rounded-lg font-semibold transition-all ${
            type === 'error' 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : type === 'success'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default Alert;

// Global alert manager
let alertCallback: ((config: { message: string; type: AlertType; onClose: () => void }) => void) | null = null;

export const setAlertCallback = (callback: (config: { message: string; type: AlertType; onClose: () => void }) => void) => {
  alertCallback = callback;
};

export const showAlert = (message: string, type: AlertType = 'error') => {
  return new Promise<void>((resolve) => {
    if (alertCallback) {
      alertCallback({
        message,
        type,
        onClose: () => resolve()
      });
    } else {
      resolve();
    }
  });
};
