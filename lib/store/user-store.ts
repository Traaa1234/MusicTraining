// User progress state. Persistence (Supabase sync) comes later.
import { create } from "zustand";

type UserStore = {
  userId: string | null;
  completedLessons: string[];
  xp: number;
  setUserId: (userId: string | null) => void;
  completeLesson: (lessonId: string) => void;
  addXp: (amount: number) => void;
};

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  completedLessons: [],
  xp: 0,
  setUserId: (userId) => set({ userId }),
  completeLesson: (lessonId) =>
    set((state) =>
      state.completedLessons.includes(lessonId)
        ? state
        : { completedLessons: [...state.completedLessons, lessonId] },
    ),
  addXp: (amount) => set((state) => ({ xp: state.xp + amount })),
}));
