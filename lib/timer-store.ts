import { create } from 'zustand';
import * as Notifications from 'expo-notifications';

export interface ActiveTimer {
  id: string;
  label: string;
  expiresAt: number; // Expiration timestamp in ms
  totalDurationSeconds: number;
  notificationId: string; // Expo notification reference ID
}

interface TimerState {
  timers: ActiveTimer[];
  startTimer: (label: string, durationSeconds: number) => Promise<void>;
  cancelTimer: (id: string) => Promise<void>;
  tick: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => {
  // Start ticking interval once store is loaded in JS thread
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      get().tick();
    }, 1000);
  }

  return {
    timers: [],
    
    startTimer: async (label: string, durationSeconds: number) => {
      try {
        const id = Math.random().toString(36).substring(2, 9);
        const expiresAt = Date.now() + durationSeconds * 1000;

        // Schedule local push notification
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Incubation timer is up! 🧪`,
            body: `${label || 'Your cell culture timer'} has finished.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: durationSeconds,
          },
        });

        const newTimer: ActiveTimer = {
          id,
          label: label || 'Incubation',
          expiresAt,
          totalDurationSeconds: durationSeconds,
          notificationId,
        };

        set((state) => ({
          timers: [...state.timers, newTimer],
        }));
      } catch (error) {
        console.error('Failed to schedule timer notification', error);
      }
    },

    cancelTimer: async (id: string) => {
      const timer = get().timers.find((t) => t.id === id);
      if (timer) {
        try {
          await Notifications.cancelScheduledNotificationAsync(timer.notificationId);
        } catch (error) {
          console.warn('Failed to cancel scheduled notification', error);
        }
      }
      set((state) => ({
        timers: state.timers.filter((t) => t.id !== id),
      }));
    },

    tick: () => {
      const now = Date.now();
      set((state) => {
        // If a timer has expired, it is filtered out of active lists
        const activeTimers = state.timers.filter((t) => t.expiresAt > now);
        if (activeTimers.length !== state.timers.length) {
          return { timers: activeTimers };
        }
        return state;
      });
    },
  };
});
