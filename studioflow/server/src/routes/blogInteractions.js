import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { postClap, deleteClap, postComment, removeComment, listComments, postBookmark, deleteBookmark, listBookmarks, checkBookmark } from '../controllers/blogInteractionController.js';
import { getUserFeed } from '../controllers/feedController.js';

const router = express.Router();

// All interaction routes require auth
router.use(verifyClerk);

router.post('/clap', postClap);
router.delete('/clap', deleteClap);

router.post('/comment', postComment);
router.delete('/comment/:commentId', removeComment);
router.get('/comment', listComments);

router.post('/bookmark', postBookmark);
router.delete('/bookmark', deleteBookmark);
router.get('/bookmarks', listBookmarks);
router.get('/bookmark/check', checkBookmark);

router.get('/feed', getUserFeed);

export default router;
