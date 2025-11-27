import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommentComposer, CommentThread } from '../CommentThread'

// Mock dependencies
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn(() => Promise.resolve('mock-token')) }),
  useUser: () => ({ user: { id: 'user-1', fullName: 'Test User', primaryEmailAddress: { emailAddress: 'test@example.com' } } })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('CommentComposer', () => {
  const mockMembers = [
    { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
    { userId: 'user-2', name: 'Bob', email: 'bob@example.com' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders comment composer with placeholder', () => {
    const { container } = render(
      <CommentComposer projectMembers={mockMembers} onSubmit={vi.fn()} />
    )
    
    expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument()
    expect(container.querySelector('[aria-label="Add emoji"]')).toBeInTheDocument()
  })

  it('calls onSubmit with text when submit button is clicked', async () => {
    const handleSubmit = vi.fn()
    render(<CommentComposer projectMembers={mockMembers} onSubmit={handleSubmit} />)
    
    const textarea = screen.getByPlaceholderText('Write a comment...')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    fireEvent.change(textarea, { target: { value: 'Test comment' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        text: 'Test comment',
        files: []
      })
    })
  })

  it('does not submit empty comment', async () => {
    const handleSubmit = vi.fn()
    const { toast } = await import('sonner')
    
    render(<CommentComposer projectMembers={mockMembers} onSubmit={handleSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(submitButton)
    
    expect(handleSubmit).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Comment cannot be empty')
  })

  it('shows mention autocomplete when typing @', async () => {
    render(<CommentComposer projectMembers={mockMembers} onSubmit={vi.fn()} />)
    
    const textarea = screen.getByPlaceholderText('Write a comment...')
    fireEvent.change(textarea, { target: { value: '@' } })
    
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('inserts emoji when selected from picker', async () => {
    render(<CommentComposer projectMembers={mockMembers} onSubmit={vi.fn()} />)
    
    const textarea = screen.getByPlaceholderText('Write a comment...')
    const emojiButton = screen.getByLabelText('Add emoji')
    
    fireEvent.click(emojiButton)
    
    await waitFor(() => {
      const emoji = screen.getByText('😀')
      fireEvent.click(emoji)
    })
    
    expect(textarea.value).toBe('😀')
  })

  it('displays keyboard shortcut hint', () => {
    render(<CommentComposer projectMembers={mockMembers} onSubmit={vi.fn()} />)
    expect(screen.getByText(/Press Ctrl\+Enter to send/i)).toBeInTheDocument()
  })
})

describe('CommentThread', () => {
  const mockComments = [
    {
      _id: 'comment-1',
      text: 'First comment',
      userId: 'user-1',
      userName: 'Alice',
      userEmail: 'alice@example.com',
      createdAt: new Date().toISOString(),
      reactions: { '👍': ['user-2'] },
      replies: []
    },
    {
      _id: 'comment-2',
      text: 'Second comment',
      userId: 'user-2',
      userName: 'Bob',
      userEmail: 'bob@example.com',
      createdAt: new Date().toISOString(),
      reactions: {},
      replies: []
    }
  ]

  const mockMembers = [
    { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
    { userId: 'user-2', name: 'Bob', email: 'bob@example.com' }
  ]

  it('renders all comments', () => {
    render(
      <CommentThread
        comments={mockComments}
        projectMembers={mockMembers}
        currentUserId="user-1"
        onAddComment={vi.fn()}
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />
    )
    
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })

  it('displays reaction counts correctly', () => {
    render(
      <CommentThread
        comments={mockComments}
        projectMembers={mockMembers}
        currentUserId="user-1"
        onAddComment={vi.fn()}
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />
    )
    
    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls onReact when reaction button is clicked', async () => {
    const handleReact = vi.fn()
    render(
      <CommentThread
        comments={mockComments}
        projectMembers={mockMembers}
        currentUserId="user-1"
        onAddComment={vi.fn()}
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={handleReact}
      />
    )
    
    const reactionButton = screen.getAllByText('👍')[0]
    fireEvent.click(reactionButton)
    
    await waitFor(() => {
      expect(handleReact).toHaveBeenCalledWith('comment-1', '👍')
    })
  })

  it('shows empty state when no comments', () => {
    render(
      <CommentThread
        comments={[]}
        projectMembers={mockMembers}
        currentUserId="user-1"
        onAddComment={vi.fn()}
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />
    )
    
    expect(screen.getByText(/No comments yet/i)).toBeInTheDocument()
  })

  it('displays threaded replies correctly', () => {
    const commentsWithReplies = [
      {
        ...mockComments[0],
        replies: [
          {
            _id: 'reply-1',
            text: 'Reply to first comment',
            userId: 'user-2',
            userName: 'Bob',
            userEmail: 'bob@example.com',
            createdAt: new Date().toISOString(),
            reactions: {},
            replies: []
          }
        ]
      }
    ]
    
    render(
      <CommentThread
        comments={commentsWithReplies}
        projectMembers={mockMembers}
        currentUserId="user-1"
        onAddComment={vi.fn()}
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReact={vi.fn()}
      />
    )
    
    expect(screen.getByText('1 reply')).toBeInTheDocument()
    expect(screen.getByText('Reply to first comment')).toBeInTheDocument()
  })
})
