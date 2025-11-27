import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from '../ProjectCard'
import { format } from 'date-fns'

describe('ProjectCard', () => {
  const mockProject = {
    _id: 'project-1',
    title: 'Test Project',
    brief: 'This is a test project',
    status: 'active',
    progress: 50,
    dueDate: new Date('2025-12-31'),
    members: [
      { userId: 'user-1', name: 'Client Name', email: 'client@example.com', role: 'client' }
    ],
    invoiceStats: { pending: 1, paid: 2, total: 3 },
    filesCount: 5,
    commentsCount: 10
  }

  it('renders project card with all information', () => {
    render(<ProjectCard project={mockProject} />)
    
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('This is a test project')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument() // Invoice stats
    expect(screen.getByText('5')).toBeInTheDocument() // Files count
    expect(screen.getByText('10')).toBeInTheDocument() // Comments count
  })

  it('shows overdue badge when past due date', () => {
    const overdueProject = {
      ...mockProject,
      dueDate: new Date('2020-01-01'),
      status: 'active'
    }
    
    render(<ProjectCard project={overdueProject} />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('calls onView when View Project is clicked', () => {
    const handleView = vi.fn()
    render(<ProjectCard project={mockProject} onView={handleView} />)
    
    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(menuButton)
    
    // Click View Project
    const viewItem = screen.getByText('View Project')
    fireEvent.click(viewItem)
    
    expect(handleView).toHaveBeenCalledWith('project-1')
  })

  it('shows client information when showClientInfo is true', () => {
    render(<ProjectCard project={mockProject} showClientInfo={true} />)
    expect(screen.getByText('Client Name')).toBeInTheDocument()
  })

  it('applies correct status color classes', () => {
    const { rerender } = render(<ProjectCard project={{ ...mockProject, status: 'completed' }} />)
    expect(screen.getByText('completed')).toHaveClass('bg-green-100')
    
    rerender(<ProjectCard project={{ ...mockProject, status: 'needs-revision' }} />)
    expect(screen.getByText('needs revision')).toHaveClass('bg-orange-100')
  })

  it('displays progress bar with correct value', () => {
    render(<ProjectCard project={mockProject} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })
})
