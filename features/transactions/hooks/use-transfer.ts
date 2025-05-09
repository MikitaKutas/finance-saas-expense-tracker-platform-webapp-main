import { create } from 'zustand';

interface TransferStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useTransfer = create<TransferStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
})); 