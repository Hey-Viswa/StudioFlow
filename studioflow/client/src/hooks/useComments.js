import { useState, useEffect, useCallback } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { useProjectSocket } from './useSocket'
import { uploadFile } from '../lib/api/files'

export function useComments(projectId) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComments = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await response.json()
      setComments(buildCommentTree(data.comments || []))
    } catch (err) {
      console.error('Fetch comments error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, getToken])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Build threaded comment structure
  const buildCommentTree = (flatComments) => {
    const commentMap = {}
    const rootComments = []

    // First pass: create map
    flatComments.forEach(comment => {
      commentMap[comment._id] = { ...comment, replies: [] }
    })

    // Second pass: build tree
    flatComments.forEach(comment => {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(commentMap[comment._id])
      } else {
        rootComments.push(commentMap[comment._id])
      }
    })

    return rootComments
  }

  const addComment = useCallback(async (data) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      // Optimistic update
      const optimisticAttachments = (data.files || []).map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // Create local preview URL
        isOptimistic: true
      }));

      const optimisticComment = {
        _id: `temp-${Date.now()}`,
        text: data.text,
        content: data.text,
        userId: user?.id,
        userName: user?.fullName || user?.firstName || 'You',
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date().toISOString(),
        reactions: {},
        replies: [],
        attachments: optimisticAttachments,
        isOptimistic: true
      }

      setComments(prev => [...prev, optimisticComment])

      let uploadedAttachments = [];
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          try {
            const result = await uploadFile(projectId, file, token, { category: 'comment_attachment' });
            uploadedAttachments.push({
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              url: result.downloadUrl || result.previewUrl,
              fileId: result.fileId,
              key: result.storageKey
            });
          } catch (uploadError) {
            console.error('File upload failed for', file.name, uploadError);
            toast.error(`Failed to upload ${file.name}`);
            throw uploadError;
          }
        }
      }

      const commentData = {
        ...data,
        attachments: uploadedAttachments
      };
      delete commentData.files;

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(commentData)
      })

      if (!response.ok) throw new Error('Failed to create comment')

      const result = await response.json()

      // Replace optimistic with real
      setComments(prev => {
        // Check if the real comment was already added via socket
        const alreadyExists = prev.some(c => c._id === result.comment._id);

        if (alreadyExists) {
          // Just remove the optimistic one
          return prev.filter(c => c._id !== optimisticComment._id);
        }

        return prev.map(c =>
          c._id === optimisticComment._id ? { ...result.comment, replies: [] } : c
        )
      })

      return result.comment
    } catch (err) {
      console.error('Add comment error:', err)
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => !c.isOptimistic))
      toast.error('Failed to add comment')
      throw err
    }
  }, [projectId, getToken, user])

  const replyToComment = useCallback(async (parentId, data) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ ...data, parentId })
      })

      if (!response.ok) throw new Error('Failed to reply to comment')

      const result = await response.json()

      // Add reply to tree
      const addReplyToTree = (comments) => {
        return comments.map(comment => {
          if (comment._id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), { ...result.comment, replies: [] }]
            }
          } else if (comment.replies?.length > 0) {
            return {
              ...comment,
              replies: addReplyToTree(comment.replies)
            }
          }
          return comment
        })
      }

      setComments(prev => addReplyToTree(prev))

      return result.comment
    } catch (err) {
      console.error('Reply comment error:', err)
      toast.error('Failed to reply to comment')
      throw err
    }
  }, [projectId, getToken])

  const editComment = useCallback(async (commentId, data) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments/${commentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to edit comment')

      const result = await response.json()

      // Update in tree
      const updateInTree = (comments) => {
        return comments.map(comment => {
          if (comment._id === commentId) {
            return { ...comment, ...data, editedAt: new Date().toISOString() }
          } else if (comment.replies?.length > 0) {
            return { ...comment, replies: updateInTree(comment.replies) }
          }
          return comment
        })
      }

      setComments(prev => updateInTree(prev))
      toast.success('Comment updated')
    } catch (err) {
      console.error('Edit comment error:', err)
      toast.error('Failed to edit comment')
      throw err
    }
  }, [projectId, getToken])

  const deleteComment = useCallback(async (commentId) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) throw new Error('Failed to delete comment')

      // Remove from tree
      const removeFromTree = (comments) => {
        return comments.filter(comment => {
          if (comment._id === commentId) return false
          if (comment.replies?.length > 0) {
            comment.replies = removeFromTree(comment.replies)
          }
          return true
        })
      }

      setComments(prev => removeFromTree(prev))
      toast.success('Comment deleted')
    } catch (err) {
      console.error('Delete comment error:', err)
      toast.error('Failed to delete comment')
      throw err
    }
  }, [projectId, getToken])

  const reactToComment = useCallback(async (commentId, emoji) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      // Optimistic update
      const updateReactions = (comments) => {
        return comments.map(comment => {
          if (comment._id === commentId) {
            const reactions = { ...comment.reactions }
            if (!reactions[emoji]) reactions[emoji] = []

            const userIndex = reactions[emoji].indexOf(user?.id)
            if (userIndex > -1) {
              reactions[emoji].splice(userIndex, 1)
              if (reactions[emoji].length === 0) delete reactions[emoji]
            } else {
              reactions[emoji].push(user?.id)
            }

            return { ...comment, reactions }
          } else if (comment.replies?.length > 0) {
            return { ...comment, replies: updateReactions(comment.replies) }
          }
          return comment
        })
      }

      setComments(prev => updateReactions(prev))

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments/${commentId}/react`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ emoji })
      })

      if (!response.ok) throw new Error('Failed to react to comment')
    } catch (err) {
      console.error('React to comment error:', err)
      toast.error('Failed to add reaction')
      throw err
    }
  }, [projectId, getToken, user])

  const resolveComment = useCallback(async (commentId) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}/comments/${commentId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) throw new Error('Failed to resolve comment')

      const updateResolved = (comments) => {
        return comments.map(comment => {
          if (comment._id === commentId) {
            return { ...comment, isResolved: true }
          } else if (comment.replies?.length > 0) {
            return { ...comment, replies: updateResolved(comment.replies) }
          }
          return comment
        })
      }

      setComments(prev => updateResolved(prev))
      toast.success('Comment resolved')
    } catch (err) {
      console.error('Resolve comment error:', err)
      toast.error('Failed to resolve comment')
      throw err
    }
  }, [projectId, getToken])

  // Real-time socket handlers
  const handleCommentAdded = useCallback((data) => {
    // console.log('🔔 Real-time comment received:', data)

    setComments(prev => {
      // Check if comment already exists to prevent duplicates
      // This handles the race condition between optimistic update resolution and socket event
      const exists = prev.some(c => c._id === data.comment._id) ||
        prev.some(c => c.replies?.some(r => r._id === data.comment._id));

      if (exists) return prev;

      if (data.comment.parentId) {
        // It's a reply
        const addReplyToTree = (comments) => {
          return comments.map(comment => {
            if (comment._id === data.comment.parentId) {
              // Check if reply already exists in this parent
              if (comment.replies?.some(r => r._id === data.comment._id)) {
                return comment;
              }
              return {
                ...comment,
                replies: [...(comment.replies || []), { ...data.comment, replies: [] }]
              }
            } else if (comment.replies?.length > 0) {
              return {
                ...comment,
                replies: addReplyToTree(comment.replies)
              }
            }
            return comment
          })
        }
        return addReplyToTree(prev)
      } else {
        return [...prev, { ...data.comment, replies: [] }]
      }
    })
  }, [])

  const handleCommentDeleted = useCallback((data) => {
    console.log('🗑️ Real-time comment deleted:', data)
    const removeFromTree = (comments) => {
      return comments.filter(comment => {
        if (comment._id === data.commentId) return false
        if (comment.replies?.length > 0) {
          comment.replies = removeFromTree(comment.replies)
        }
        return true
      })
    }
    setComments(prev => removeFromTree(prev))
  }, [])

  const handleCommentUpdated = useCallback((data) => {
    console.log('✏️ Real-time comment updated:', data)
    const updateInTree = (comments) => {
      return comments.map(comment => {
        if (comment._id === data.comment._id) {
          return { ...comment, ...data.comment }
        } else if (comment.replies?.length > 0) {
          return { ...comment, replies: updateInTree(comment.replies) }
        }
        return comment
      })
    }
    setComments(prev => updateInTree(prev))
  }, [])

  useProjectSocket(projectId, {
    onCommentAdded: handleCommentAdded,
    onCommentDeleted: handleCommentDeleted,
    onCommentUpdated: handleCommentUpdated
  })

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
    addComment,
    replyToComment,
    editComment,
    deleteComment,
    reactToComment,
    resolveComment
  }
}
