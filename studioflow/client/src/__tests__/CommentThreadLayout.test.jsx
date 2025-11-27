import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommentThread } from '../components/CommentThread'
import React from 'react'

// Mock dependencies
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn(() => Promise.resolve('mock-token')) }),
  useUser: () => ({ user: { id: 'user-1' } })
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

describe('CommentThread Layout', () => {
  const mockComments = [
    { _id: '1', text: 'Comment 1', userId: 'user-1', createdAt: new Date().toISOString() }
  ]

  it('renders with correct layout structure', () => {
    const { container } = render(
      <CommentThread 
        comments={mockComments} 
        projectMembers={[]} 
        currentUserId="user-1" 
      />
    )
    
    // Check for flex column container
    const mainContainer = container.firstChild
    expect(mainContainer.classList.contains('flex')).toBe(true)
    expect(mainContainer.classList.contains('flex-col')).toBe(true)
    expect(mainContainer.classList.contains('h-full')).toBe(true)
    expect(mainContainer.classList.contains('relative')).toBe(true)
    
    // Check for scrollable list
    const list = container.querySelector('.overflow-y-auto')
    expect(list).not.toBeNull()
    expect(list.classList.contains('h-full')).toBe(true)
    expect(list.classList.contains('scroll-smooth')).toBe(true)
    
    // Check for sticky composer at bottom
    const composerContainer = container.querySelector('.sticky.bottom-0')
    expect(composerContainer).not.toBeNull()
    expect(composerContainer.classList.contains('flex-shrink-0')).toBe(true)
    expect(composerContainer.className).toContain('sticky')
    expect(composerContainer.className).toContain('bottom-0')
    expect(composerContainer.className).toContain('border-t')
    expect(composerContainer.className).toContain('bg-background')
    
    // Verify order: List comes before Composer
    expect(list.compareDocumentPosition(composerContainer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
