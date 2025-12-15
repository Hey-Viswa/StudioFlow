import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { 
    getStoryboard, 
    createScene, 
    updateScene, 
    deleteScene,
    addSceneComment,
    createEdge, 
    updateEdge,
    deleteEdge 
} from '../controllers/storyboardController.js';

const router = express.Router();

// Feature Flag Middleware
const checkFeatureFlag = (req, res, next) => {
    if (process.env.ENABLE_STORYBOARD !== 'true') {
        return res.status(404).json({ error: 'Feature disabled' });
    }
    next();
};

router.use(verifyClerk);
// router.use(checkFeatureFlag);

// Storyboard
router.get('/:projectId/storyboard', getStoryboard);

// Scenes
router.post('/:projectId/storyboard/scenes', createScene);
router.patch('/:projectId/storyboard/scenes/:sceneId', updateScene);
router.delete('/:projectId/storyboard/scenes/:sceneId', deleteScene);
router.post('/:projectId/storyboard/scenes/:sceneId/comments', addSceneComment);

// Edges
router.post('/:projectId/storyboard/edges', createEdge);
router.patch('/:projectId/storyboard/edges/:edgeId', updateEdge);
router.delete('/:projectId/storyboard/edges/:edgeId', deleteEdge);

export default router;
