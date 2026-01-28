/**
 * Alert utility for showing popup alerts throughout the app
 */

import { showAlert as showCustomAlert } from '../components/Alert';

export const showAlert = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
  return showCustomAlert(message, type);
};
