import { create } from 'zustand';

const useDialogStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  buttons: [],
  showDialog: ({ title, message, buttons = [] }) => {
    set({
      isOpen: true,
      title: title || '',
      message: message || '',
      buttons: buttons.length ? buttons : [{ text: 'OK', onPress: () => {} }],
    });
  },
  hideDialog: () => {
    set({ isOpen: false });
  },
}));

export default useDialogStore;
