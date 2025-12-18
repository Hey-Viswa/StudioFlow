import { isFeatureEnabled } from '../utils/featureFlags.js';

export const checkFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // console.log(`[checkFeature] Checking ${featureName} for ${req.path}`);
      const projectId = (req.params && req.params.projectId) || (req.body && req.body.projectId);
      
      const enabled = await isFeatureEnabled(featureName, {
        projectId,
        user: req.user
      });

      if (!enabled) {
        return res.status(403).json({ 
          error: 'Feature Disabled', 
          message: `The feature '${featureName}' is currently disabled.`
        });
      }

      next();
    } catch (error) {
      console.error(`[FeatureFlag] Error checking ${featureName}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
