/**
 * Custom Skin Loader
 * 
 * Dynamically loads the appropriate custom skin based on the VITE_CUSTOM_SKIN environment variable.
 * Falls back to the default skin if the specified skin is not found.
 */

/**
 * Get the active skin name from environment variable
 * @returns {string} The skin name to load
 */
export const getActiveSkin = () => {
  return import.meta.env?.VITE_CUSTOM_SKIN || 'default';
};

/**
 * Load the splash page component for the active skin
 * @returns {Promise<React.Component>} The splash page component
 */
export const loadSplashPage = async () => {
  const skinName = getActiveSkin();
  
  try {
    // Try to load the specified skin
    const module = await import(`./${skinName}/SplashPage.jsx`);
    return module?.default;
  } catch (error) {
    console.warn(`Failed to load skin '${skinName}', falling back to default:`, error);
    
    // Fallback to default skin
    try {
      const defaultModule = await import('./default/SplashPage.jsx');
      return defaultModule?.default;
    } catch (fallbackError) {
      console.error('Failed to load default skin:', fallbackError);
      return null;
    }
  }
};

/**
 * Load the configuration for the active skin
 * @returns {Promise<Object>} The skin configuration object
 */
export const loadSkinConfig = async () => {
  const skinName = getActiveSkin();
  
  try {
    const module = await import(`./${skinName}/config.js`);
    return module?.default;
  } catch (error) {
    console.warn(`Failed to load config for skin '${skinName}', using default:`, error);
    
    try {
      const defaultModule = await import('./default/config.js');
      return defaultModule?.default;
    } catch (fallbackError) {
      console.error('Failed to load default skin config:', fallbackError);
      return {};
    }
  }
};

/**
 * Get list of available skins
 * Note: This requires manual maintenance as dynamic folder listing isn't available in browser
 * @returns {Array<string>} Array of available skin names
 */
export const getAvailableSkins = () => {
  return [
    'default'
    // Add new skin names here as they are created
  ];
};

export default {
  getActiveSkin,
  loadSplashPage,
  loadSkinConfig,
  getAvailableSkins
};