import { createContext, useContext, useState, useEffect } from 'react';

const FeatureFlagContext = createContext();

export const useReviewFeatureFlag = () => useContext(FeatureFlagContext);

export const FeatureFlagProvider = ({ children }) => {
  const [features, setFeatures] = useState(() => {
    try {
      const stored = localStorage.getItem('experimental-features');
      if (stored) return JSON.parse(stored);
      
      // Default from environment variable if not in local storage
      const envEnableStoryboard = import.meta.env.VITE_ENABLE_STORYBOARD === 'true';
      return { storyboard: envEnableStoryboard };
    } catch (e) {
      return { storyboard: false };
    }
  });

  const toggleFeature = (featureName) => {
    setFeatures((prev) => {
      const newState = { ...prev, [featureName]: !prev[featureName] };
      localStorage.setItem('experimental-features', JSON.stringify(newState));
      return newState;
    });
  };

  const setFeature = (featureName, value) => {
    setFeatures((prev) => {
      const newState = { ...prev, [featureName]: value };
      localStorage.setItem('experimental-features', JSON.stringify(newState));
      return newState;
    });
  };

  // Sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'experimental-features') {
        try {
          const newState = JSON.parse(e.newValue);
          setFeatures(newState || {});
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ features, toggleFeature, setFeature }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
