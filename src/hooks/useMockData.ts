import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useMockData<T>(key: string, initialData: T[]) {
  const { user } = useAuth();
  const storageKey = `@app:${user?.id}:${key}`;

  const [data, setData] = useState<T[]>(() => {
    if (!user) return [];
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    
    // Seed initial data if empty
    localStorage.setItem(storageKey, JSON.stringify(initialData));
    return initialData;
  });

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        localStorage.setItem(storageKey, JSON.stringify(initialData));
        setData(initialData);
      }
    }
  }, [user, storageKey]);

  const updateData = (newData: T[]) => {
    setData(newData);
    localStorage.setItem(storageKey, JSON.stringify(newData));
  };

  return [data, updateData] as const;
}
