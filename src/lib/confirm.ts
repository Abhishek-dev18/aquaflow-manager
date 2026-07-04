import type { ConfirmConfig } from '../components/ConfirmModal';

type ConfirmOptions = Omit<ConfirmConfig, 'onConfirm' | 'onCancel'>;

let confirmCallback: ((config: ConfirmConfig) => void) | null = null;

export const setConfirmCallback = (cb: (config: ConfirmConfig) => void) => {
  confirmCallback = cb;
};

export const showConfirm = (
  message: string,
  options: Partial<ConfirmOptions> = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!confirmCallback) {
      resolve(window.confirm(message));
      return;
    }
    confirmCallback({
      message,
      ...options,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};
