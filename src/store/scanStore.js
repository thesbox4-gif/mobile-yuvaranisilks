import { create } from 'zustand';

const useScanStore = create((set) => ({
  pendingBarcode: null,
  setPendingBarcode: (code) => set({ pendingBarcode: code }),
  clearPendingBarcode: () => set({ pendingBarcode: null }),
}));

export default useScanStore;
