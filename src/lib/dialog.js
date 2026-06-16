import { Platform } from 'react-native';
import useDialogStore from '../store/dialogStore';

// react-native-web's Alert.alert renders via window.alert and ignores the
// buttons array entirely. These helpers fall back to the browser's 
// window.confirm / window.alert there and use our custom GlobalDialog on devices.

export function confirmDialog({
  title,
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (Platform.OS === 'web') {
    const ok = window.confirm([title, message].filter(Boolean).join('\n\n'));
    if (ok) onConfirm?.();
    else onCancel?.();
    return;
  }
  useDialogStore.getState().showDialog({
    title,
    message,
    buttons: [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]
  });
}

// Single-acknowledgement notice.
export function notifyDialog({ title, message = '', onClose }) {
  if (Platform.OS === 'web') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
    onClose?.();
    return;
  }
  useDialogStore.getState().showDialog({
    title,
    message,
    buttons: [{ text: 'OK', onPress: onClose }]
  });
}

// Drop-in replacement for Alert.alert
export function alertDialog(title, message, buttons) {
  if (Platform.OS === 'web') {
    const isConfirm = buttons && buttons.length > 1;
    if (isConfirm) {
      const ok = window.confirm([title, message].filter(Boolean).join('\n\n'));
      const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[1];
      const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
      if (ok && confirmBtn?.onPress) confirmBtn.onPress();
      else if (!ok && cancelBtn?.onPress) cancelBtn.onPress();
    } else {
      window.alert([title, message].filter(Boolean).join('\n\n'));
      if (buttons && buttons[0]?.onPress) buttons[0].onPress();
    }
    return;
  }
  useDialogStore.getState().showDialog({ title, message, buttons });
}
