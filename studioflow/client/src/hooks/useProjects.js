import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { useSocket } from './useSocket'

export function useProjects(filters = {}) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const socket = useSocket()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Memoize filter values to prevent unnecessary rerenders
  const filterKey = useMemo(() =>
    JSON.stringify({
      status: filters.status || 'all',
      search: filters.search || '',
      clientId: filters.clientId || 'all',
      dateRange: filters.dateRange || 'all'
    }),
    [filters.status, filters.search, filters.clientId, filters.dateRange]
  )

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const queryParams = new URLSearchParams()
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.clientId && filters.clientId !== 'all') queryParams.append('clientId', filters.clientId)
      if (filters.dateRange && filters.dateRange !== 'all') queryParams.append('dateRange', filters.dateRange)

      const url = `${apiUrl}/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Fetch projects error:', err)
      setError(err.message)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [getToken, filterKey])

  // Debounce filter changes (especially search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProjects()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [fetchProjects])

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleProjectUpdated = (data) => {
      setProjects(prev => {
        const exists = prev.find(p => p._id === data.projectId)
        if (exists) {
          return prev.map(p =>
            p._id === data.projectId
              ? { ...p, ...data.updates }
              : p
          )
        }
        return prev
      })
    }

    const handleProjectCreated = (data) => {
      // Only refetch if the current user is the owner (or we could check if we should see it)
      // Since we don't have the full project object, refetching is safer
      if (user && data.ownerId === user.id) {
        fetchProjects()
      }
    }

    socket.on('project-updated', handleProjectUpdated)
    socket.on('project-created', handleProjectCreated)

    return () => {
      socket.off('project-updated', handleProjectUpdated)
      socket.off('project-created', handleProjectCreated)
    }
  }, [socket, fetchProjects, user])

  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      const data = await response.json()

      // Optimistically update local state
      setProjects(prev => prev.map(p =>
        p._id === projectId ? { ...p, ...updates } : p
      ))

      toast.success('Project updated successfully')
      return data
    } catch (err) {
      console.error('Update project error:', err)
      toast.error('Failed to update project')
      throw err
    }
  }, [getToken])

  const requestRevision = useCallback(async (projectId, notes) => {
    return updateProject(projectId, {
      status: 'needs-revision',
      revisionNotes: notes
    })
  }, [updateProject])

  const approveFinal = useCallback(async (projectId) => {
    return updateProject(projectId, {
      status: 'finalized',
      finalizedAt: new Date().toISOString()
    })
  }, [updateProject])

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    updateProject,
    requestRevision,
    approveFinal
  }
}

export function useProjectMetrics(viewContext) {
  const { getToken } = useAuth()
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    totalBilledChange: 0,
    totalPaidChange: 0,
    overdueChange: 0,
    clientMetrics: { totalSpent: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 },
    roleContext: 'mixed'
  })
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState(0)
  const [lastContext, setLastContext] = useState(null)

  const fetchMetrics = useCallback(async (force = false) => {
    const now = Date.now()
    // Bypass throttle if forced or if context changed
    if (!force && viewContext === lastContext && now - lastFetch < 30000) {
      return
    }

    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const queryParams = new URLSearchParams()
      if (viewContext) queryParams.append('viewContext', viewContext)

      const response = await fetch(`${apiUrl}/dashboard/metrics?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(prev => ({ ...prev, ...data.metrics }))
        setLastFetch(now)
        setLastContext(viewContext)
      }
    } catch (err) {
      console.error('Fetch metrics error:', err)
    } finally {
      setLoading(false)
    }
  }, [getToken, viewContext, lastContext, lastFetch])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, loading, refetch: () => fetchMetrics(true) }
}
