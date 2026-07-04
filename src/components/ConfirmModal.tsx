import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmConfig {
  message: string;
  title?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmConfig> = ({
  message,
  title,
  danger = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
      {/* Icon + Content */}
      <div className="px-6 pt-6 pb-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
          danger ? 'bg-red-100' : 'bg-brand-50'
        }`}>
          {danger
            ? <AlertTriangle size={22} className="text-red-600" />
            : <HelpCircle size={22} className="text-brand-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-bold text-gray-800 text-base leading-tight mb-1">{title}</h3>
          )}
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mx-6" />

      {/* Actions */}
      <div className="px-6 py-4 flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-95 ${
            danger
              ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
              : 'bg-brand-600 hover:bg-brand-700 shadow-brand-100'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
