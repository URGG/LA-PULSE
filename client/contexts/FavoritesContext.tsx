import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@la_events_favorites';

interface FavoritesContextType {
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (eventId: string) => void;
  isFavorite: (eventId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingTogglesRef = useRef<string[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!isLoading && favorites.length >= 0) {
      saveFavorites(favorites);
    }
  }, [favorites, isLoading]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const loadedFavorites = stored ? JSON.parse(stored) : [];
      
      const pendingIds = pendingTogglesRef.current;
      let mergedFavorites = [...loadedFavorites];
      
      for (const id of pendingIds) {
        const index = mergedFavorites.indexOf(id);
        if (index === -1) {
          mergedFavorites.push(id);
        } else {
          mergedFavorites.splice(index, 1);
        }
      }
      
      pendingTogglesRef.current = [];
      setFavorites(mergedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = useCallback((eventId: string) => {
    if (isLoading) {
      pendingTogglesRef.current.push(eventId);
      return;
    }
    
    setFavorites((current) => {
      const isFavorited = current.includes(eventId);
      return isFavorited
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
    });
  }, [isLoading]);

  const isFavorite = useCallback(
    (eventId: string) => {
      if (isLoading) {
        return pendingTogglesRef.current.filter(id => id === eventId).length % 2 === 1;
      }
      return favorites.includes(eventId);
    },
    [favorites, isLoading]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isLoading,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
