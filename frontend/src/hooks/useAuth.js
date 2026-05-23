import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';

export function useAuthBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const subscribeToAuth = useAuthStore((state) => state.subscribeToAuth);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) {
      hydrate();
    }
  }, [hydrate, initialized]);

  useEffect(() => {
    const subscription = subscribeToAuth();
    return () => subscription?.unsubscribe();
  }, [subscribeToAuth]);
}
