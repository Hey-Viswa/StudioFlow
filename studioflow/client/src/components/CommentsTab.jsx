import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Loader2, Send, Trash2, Paperclip, X, File } from 'lucide-react';
import { useProjectSocket } from '../hooks/useSocket';
import { uploadFile, formatFileSize } from '@/lib/api/files';

export default function CommentsTab({ projectId, project }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Socket.IO callbacks for real-time updates
  const handleCommentAdded = useCallback((data) => {
    console.log('🔔 Real-time comment received:', data);
    setComments(prev => [...prev, data.comment]);
  }, []);

  const handleCommentDeleted = useCallback((data) => {
    console.log('🗑️  Real-time comment deleted:', data);
    setComments(prev => prev.filter(c => c._id !== data.commentId));
  }, []);

  // Connect to Socket.IO for real-time updates
  useProjectSocket(projectId, {
    onCommentAdded: handleCommentAdded,
    onCommentDeleted: handleCommentDeleted
  });

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/comments`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Fetch comments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newAttachments = [...attachments];

    try {
      const token = await getToken();

      // Upload each file
      for (const file of files) {
        // Add pending attachment
        const tempId = Date.now() + Math.random();
        newAttachments.push({
          id: tempId,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading'
        });
        setAttachments([...newAttachments]);

        try {
          const result = await uploadFile(projectId, file, token);

          // Update attachment with result
          const index = newAttachments.findIndex(a => a.id === tempId);
          if (index !== -1) {
            newAttachments[index] = {
              ...newAttachments[index],
              status: 'completed',
              fileId: result.fileId,
              url: result.downloadUrl || result.previewUrl, // Use what's available
              key: result.storageKey
            };
            setAttachments([...newAttachments]);
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);

          // Remove failed attachment
          const index = newAttachments.findIndex(a => a.id === tempId);
          if (index !== -1) {
            newAttachments.splice(index, 1);
            setAttachments([...newAttachments]);
          }
        }
      }
    } catch (error) {
      console.error('Upload handling error:', error);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!newComment.trim() && attachments.length === 0) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (uploading) {
      toast.warning('Please wait for uploads to complete');
      return;
    }

    // Prepare attachments payload
    const finalAttachments = attachments.map(a => ({
      name: a.name,
      size: a.size,
      type: a.type,
      url: a.url,
      fileId: a.fileId,
      key: a.key
    }));

    // Optimistic UI update
    const optimisticComment = {
      _id: `temp-${Date.now()}`,
      text: newComment.trim(),
      userId: user?.id,
      userName: user?.fullName || user?.firstName || 'You',
      userEmail: user?.primaryEmailAddress?.emailAddress,
      createdAt: new Date().toISOString(),
      attachments: finalAttachments,
      isOptimistic: true
    };

    setComments(prev => [...prev, optimisticComment]);
    setNewComment('');
    setAttachments([]);

    setSubmitting(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          text: optimisticComment.text,
          attachments: finalAttachments
        })
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const data = await response.json();

      // Replace optimistic comment with real one
      setComments(prev => prev.map(c =>
        c._id === optimisticComment._id ? data.comment : c
      ));

      toast.success('Comment added!');
    } catch (error) {
      console.error('Create comment error:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c._id !== optimisticComment._id));
      setNewComment(optimisticComment.text); // Restore text
      setAttachments(finalAttachments); // Restore attachments
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (commentUserId !== user?.id && !project?.isOwner) {
      toast.error('You can only delete your own comments');
      return;
    }

    if (!confirm('Delete this comment?')) return;

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      setComments(comments.filter(c => c._id !== commentId));
      toast.success('Comment deleted!');
    } catch (error) {
      console.error('Delete comment error:', error);
      toast.error('Failed to delete comment');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user?.fullName || user?.firstName || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="resize-none"
            />

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={file.id || index} className="flex items-center gap-2 bg-muted p-2 rounded-md border text-sm">
                    {file.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <File className="w-4 h-4 text-primary" />
                    )}
                    <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
                    <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || submitting}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach File
                </Button>
              </div>

              <Button type="submit" disabled={submitting || (uploading || (!newComment.trim() && attachments.length === 0))}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-3 group">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(comment.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.userName || comment.userEmail || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  {(comment.userId === user?.id || project?.isOwner) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteComment(comment._id, comment.userId)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text || comment.content}</p>

                {/* Comment Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {comment.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-muted/50 p-2 rounded border hover:bg-muted transition-colors text-sm"
                      >
                        <File className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[200px]">{att.name}</span>
                        {att.size && <span className="text-xs text-muted-foreground">({formatFileSize(att.size)})</span>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
