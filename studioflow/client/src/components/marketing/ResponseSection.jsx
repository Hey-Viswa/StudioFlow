import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, Trash2, Reply, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Single Comment Component handling display, likes, replies, and deletion
 */
const CommentItem = ({ comment, contentId, onReply, onDelete, onLike, currentUserId, isReply = false }) => {
    const [liked, setLiked] = useState(comment.likedBy?.includes(currentUserId));
    const [likesCount, setLikesCount] = useState(comment.likes || 0);

    const handleLike = async () => {
        if (!currentUserId) return toast.error('Please sign in to like comments');
        
        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            const res = await onLike(comment._id);
            // Sync with server source of truth if needed, but optimistic is smoother
        } catch (error) {
            // Revert on error
            setLiked(!newLiked);
            setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
            toast.error('Failed to like comment');
        }
    };

    return (
        <div className={`group flex gap-3 ${isReply ? 'ml-12 mt-4' : 'mt-6'}`}>
            <Avatar className="w-8 h-8">
                <AvatarImage src={comment.author?.avatarUrl} />
                <AvatarFallback>{comment.author?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.author?.displayName || 'Unknown User'}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{comment.body}</p>
                
                <div className="flex items-center gap-4 pt-1">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                        {likesCount > 0 && likesCount}
                    </button>
                    {!isReply && (
                        <button 
                            onClick={() => onReply(comment)} 
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                            <Reply className="w-3.5 h-3.5" />
                            Reply
                        </button>
                    )}
                    {currentUserId === comment.userId && (
                         <button 
                            onClick={() => onDelete(comment._id)} 
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive font-medium transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResponseSection = ({ contentId }) => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // Parent comment object

    useEffect(() => {
        if (contentId) fetchComments();
    }, [contentId]);

    const fetchComments = async () => {
        try {
            const data = await api.get(`/${contentId}/responses`);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user) return toast.error('Please sign in to comment');
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const payload = {
                contentId,
                body: newComment,
                parentId: replyingTo?._id || null
            };
            
            await api.post('/responses', payload, { getToken });
            setNewComment('');
            setReplyingTo(null);
            fetchComments(); // Refresh list to get populated fields correctly
            toast.success('Comment posted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        try {
            await api.delete(`/responses/${commentId}`, { getToken });
            fetchComments();
            toast.success('Deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleLike = async (commentId) => {
        return api.post(`/responses/${commentId}/like`, {}, { getToken });
    };

    if (loading) return <div className="py-10 text-center"><Loader2 className="animate-spin w-5 h-5 mx-auto text-muted-foreground" /></div>;

    return (
        <div className="max-w-2xl mx-auto py-12 border-t border-border/40">
            <h3 className="text-xl font-bold font-serif mb-8 flex items-center gap-2">
                Responses 
                <span className="text-sm font-sans font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {comments.reduce((acc, curr) => acc + 1 + (curr.replies?.length || 0), 0)}
                </span>
            </h3>

            {/* Input Area */}
            <div className="flex gap-4 mb-10">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                     {replyingTo && (
                        <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md text-sm">
                            <span className="text-muted-foreground">Replying to <span className="font-semibold text-foreground">{replyingTo.author?.displayName}</span></span>
                            <button onClick={() => setReplyingTo(null)} className="text-xs hover:underline">Cancel</button>
                        </div>
                    )}
                    <Textarea 
                        placeholder={user ? "What are your thoughts?" : "Sign in to leave a comment"}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        disabled={!user || submitting}
                        className="resize-none min-h-[100px] border-border/60 focus:border-foreground/40 font-serif text-base"
                    />
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!user || submitting || !newComment.trim()}
                            className="rounded-full"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Respond'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-8">
                {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 italic font-serif">No responses yet. Be the first to share your thoughts.</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment._id}>
                            <CommentItem 
                                comment={comment} 
                                contentId={contentId}
                                currentUserId={user?.id} // Clerk ID usually matches userId in DB
                                onReply={setReplyingTo}
                                onDelete={handleDelete}
                                onLike={handleLike}
                            />
                            {/* Render Replies */}
                            {comment.replies?.map(reply => (
                                <CommentItem 
                                    key={reply._id}
                                    comment={reply}
                                    contentId={contentId}
                                    currentUserId={user?.id}
                                    onReply={setReplyingTo} // Replying to a reply -> replies to parent
                                    onDelete={handleDelete}
                                    onLike={handleLike}
                                    isReply={true}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const User = () => <div className="w-full h-full bg-muted flex items-center justify-center text-xs">?</div>;

export default ResponseSection;
