import { create } from 'zustand';

export const useUiStore = create((set) => ({
  notice: '',
  setNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: '' })
}));
