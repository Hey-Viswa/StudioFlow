import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { toast } from 'sonner'

export function useFiles(projectId) {
  const { getToken } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFiles = useCallback(async () => {
    if (!projectId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/files`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }

      const data = await response.json()
      setFiles(data.files || [])
    } catch (err) {
      console.error('Fetch files error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, getToken])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const uploadFile = useCallback(async (file, metadata = {}) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const formData = new FormData()
      formData.append('file', file)
      if (metadata.description) formData.append('description', metadata.description)
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/files`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      })

      if (!response.ok) throw new Error('Failed to upload file')

      const data = await response.json()
      setFiles(prev => [...prev, data.file])
      toast.success('File uploaded successfully')
      
      return data.file
    } catch (err) {
      console.error('Upload file error:', err)
      toast.error('Failed to upload file')
      throw err
    }
  }, [projectId, getToken])

  const deleteFile = useCallback(async (fileId) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) throw new Error('Failed to delete file')

      setFiles(prev => prev.filter(f => f.fileId !== fileId))
      toast.success('File deleted')
    } catch (err) {
      console.error('Delete file error:', err)
      toast.error('Failed to delete file')
      throw err
    }
  }, [projectId, getToken])

  const shareFile = useCallback(async (fileId, clientId, options = {}) => {
    try {
      const token = await getToken()
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/files/${fileId}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ clientId, ...options })
      })

      if (!response.ok) throw new Error('Failed to share file')

      const data = await response.json()
      toast.success('File shared successfully')
      
      return data
    } catch (err) {
      console.error('Share file error:', err)
      toast.error('Failed to share file')
      throw err
    }
  }, [projectId, getToken])

  return {
    files,
    loading,
    error,
    refetch: fetchFiles,
    uploadFile,
    deleteFile,
    shareFile
  }
}
