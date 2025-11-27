import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useComments } from '../hooks/useComments'

// Mock dependencies
const mockGetToken = vi.fn(() => Promise.resolve('mock-token'))
const mockUser = { id: 'user-1', fullName: 'Test User' }

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
  useUser: () => ({ user: mockUser })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../hooks/useSocket', () => ({
  useProjectSocket: vi.fn((projectId, callbacks) => {
    // Store callbacks for testing
    global.socketCallbacks = callbacks
  })
}))

global.fetch = vi.fn()

describe('useComments hook', () => {
  const projectId = 'project-1'
  
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()
  })

  it('fetches comments on mount', async () => {
    const mockComments = [
      { _id: 'comment-1', text: 'Test comment', userId: 'user-1', createdAt: new Date().toISOString() }
    ]
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: mockComments })
    })
    
    const { result } = renderHook(() => useComments(projectId))
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.comments).toHaveLength(1)
    })
  })

  it('builds comment tree correctly', async () => {
    const mockComments = [
      { _id: 'comment-1', text: 'Parent', userId: 'user-1', parentId: null },
      { _id: 'comment-2', text: 'Child', userId: 'user-2', parentId: 'comment-1' }
    ]
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: mockComments })
    })
    
    const { result } = renderHook(() => useComments(projectId))
    
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1)
      expect(result.current.comments[0].replies).toHaveLength(1)
      expect(result.current.comments[0].replies[0].text).toBe('Child')
    })
  })

  it('adds comment with optimistic update', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comment: { _id: 'new-comment', text: 'New comment', userId: 'user-1' } })
      })
    
    const { result } = renderHook(() => useComments(projectId))
    
    await waitFor(() => expect(result.current.loading).toBe(false))
    
    await result.current.addComment({ text: 'New comment' })
    
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1)
      expect(result.current.comments[0].text).toBe('New comment')
    })
  })

  it('handles real-time comment added event', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ comments: [] })
    })
    
    const { result } = renderHook(() => useComments(projectId))
    
    await waitFor(() => expect(result.current.loading).toBe(false))
    
    // Simulate real-time event
    const newComment = {
      _id: 'realtime-comment',
      text: 'Realtime comment',
      userId: 'user-2',
      replies: []
    }
    
    global.socketCallbacks.onCommentAdded({ comment: newComment })
    
    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1)
      expect(result.current.comments[0]._id).toBe('realtime-comment')
    })
  })

  it('reacts to comment with optimistic update', async () => {
    const mockComments = [
      { _id: 'comment-1', text: 'Test', userId: 'user-1', reactions: {} }
    ]
    
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments: mockComments })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })
    
    const { result } = renderHook(() => useComments(projectId))
    
    await waitFor(() => expect(result.current.loading).toBe(false))
    
    await result.current.reactToComment('comment-1', '👍')
    
    await waitFor(() => {
      expect(result.current.comments[0].reactions['👍']).toContain('user-1')
    })
  })
})
