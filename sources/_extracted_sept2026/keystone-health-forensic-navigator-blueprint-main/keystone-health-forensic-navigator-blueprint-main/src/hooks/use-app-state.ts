import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface AppState {
  isExpertMode: boolean;
  activeCounty: string;
  hasSeenTour: boolean;
  toggleExpertMode: () => void;
  setExpertMode: (val: boolean) => void;
  setActiveCounty: (county: string) => void;
  setHasSeenTour: (val: boolean) => void;
}
export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      isExpertMode: false,
      activeCounty: "Allegheny",
      hasSeenTour: false,
      toggleExpertMode: () => set((state) => ({ isExpertMode: !state.isExpertMode })),
      setExpertMode: (val) => set({ isExpertMode: val }),
      setActiveCounty: (county) => set({ activeCounty: county }),
      setHasSeenTour: (val) => set({ hasSeenTour: val }),
    }),
    {
      name: 'keystone-app-preferences',
    }
  )
);