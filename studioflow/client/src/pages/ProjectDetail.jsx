import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useProjectSocket } from '../hooks/useSocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import TasksTab from '../components/TasksTab';
import CommentsTab from '../components/CommentsTab';
import ProjectInvoiceList from '../components/ProjectInvoiceList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Share2,
  CheckCircle2,
  Copy,
  Calendar as CalendarIcon,
  Users,
  FileText,
  Crown,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  ListTodo,
  MessageSquare,
  Upload,
  Home,
  MoreVertical
} from 'lucide-react';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    brief: '',
    status: '',
    dueDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch project function that can be called from socket listeners
  const fetchProject = useCallback(async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch project');
      }

      const data = await response.json();
      setProject(data.project);
      setProgressValue(data.project.progress || 0);
      setInviteLink(data.inviteLink);
      setError(null);
    } catch (err) {
      console.error('Fetch project error:', err);
      setError(err.message);
      if (err.message.includes('Access denied') || err.message.includes('not found')) {
        setTimeout(() => navigate('/dashboard/projects'), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, getToken, navigate]);

  // Setup Socket.IO for real-time updates
  useProjectSocket(projectId, {
    onProjectUpdated: (data) => {
      console.log('📡 Project updated via socket:', data);
      toast.info('Project updated by another user');
      fetchProject();
    },
    onMemberJoined: (data) => {
      console.log('📡 New member joined:', data);
      toast.success(`${data.member.name || 'Someone'} joined the project`);
      fetchProject();
    },
    onCommentAdded: (data) => {
      console.log('📡 New comment added:', data);
      // CommentsTab will handle this
    },
    onTaskAdded: (data) => {
      console.log('📡 New task added:', data);
      // TasksTab will handle this
    },
    onTaskUpdated: (data) => {
      console.log('📡 Task updated:', data);
      fetchProject(); // Refresh to get updated progress
    }
  });

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const generateInviteLink = async () => {
    setGeneratingInvite(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate invite' }));
        throw new Error(errorData.error || 'Failed to generate invite');
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);
      toast.success('Invite link generated successfully!');
    } catch (err) {
      console.error('Generate invite error:', err);
      toast.error(err.message || 'Failed to generate invite link');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startEditing = () => {
    setEditForm({
      title: project.title,
      brief: project.brief || '',
      status: project.status,
      progress: project.progress || 0,
      dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({ title: '', brief: '', status: '', progress: 0, dueDate: '' });
  };

  const validateDate = (dateString) => {
    // Date format validation: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return { valid: false, message: 'Invalid date format. Use YYYY-MM-DD' };
    }

    // Parse and validate actual date
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Invalid date' };
    }

    // Check if date is in the past
    if (date < today) {
      return { valid: false, message: 'Due date cannot be in the past' };
    }

    return { valid: true };
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // Validate character limits
    if (name === 'title' && value.length > 50) {
      toast.error('Title must be 50 characters or less');
      return;
    }
    if (name === 'brief' && value.length > 100) {
      toast.error('Brief must be 100 characters or less');
      return;
    }
    
    // Validate date
    if (name === 'dueDate' && value) {
      const validation = validateDate(value);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
    }
    
    // Validate progress range
    if (name === 'progress') {
      const numValue = Number(value);
      if (numValue < 0 || numValue > 100) {
        toast.error('Progress must be between 0 and 100');
        return;
      }
    }
    
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveProject = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Prepare update data
      const updateData = {
        title: editForm.title,
        brief: editForm.brief,
        status: editForm.status,
        progress: editForm.progress,
        dueDate: editForm.dueDate || null // Send null if empty to clear the date
      };
      
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update project' }));
        throw new Error(errorData.error || 'Failed to update project');
      }

      const data = await response.json();
      setProject(data.project);
      setIsEditing(false);
      toast.success('Project updated successfully!');
      
      // Refresh project data to ensure UI is in sync
      await fetchProject();
    } catch (err) {
      console.error('Update project error:', err);
      toast.error(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmInput('');
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmInput('');
  };

  const deleteProjectHandler = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Redirect to dashboard after successful deletion
      toast.success('Project deleted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Delete project error:', err);
      toast.error(err.message || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const updateProjectProgress = async () => {
    setUpdatingProgress(true);
    try {
      console.log('📊 Updating progress:', { projectId, progressValue });
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${apiUrl}/projects/${projectId}`;
      
      // Automatically set status to 'completed' if progress is 100%
      const updateData = { progress: progressValue };
      if (progressValue === 100) {
        updateData.status = 'completed';
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update progress' }));
        throw new Error(errorData.error || 'Failed to update progress');
      }

      const data = await response.json();
      
      if (progressValue === 100) {
        toast.success('Progress updated to 100% and project marked as completed! 🎉');
      } else {
        toast.success('Progress updated successfully!');
      }
      
      setProject(prev => ({ ...prev, progress: progressValue, ...(progressValue === 100 && { status: 'completed' }) }));
      
      // Fetch fresh data to ensure sync
      await fetchProject();
    } catch (err) {
      console.error('Update progress error:', err);
      toast.error(err.message || 'Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
      completed: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      'on-hold': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      archived: 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    };
    return colors[status] || colors.active;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project?.title || 'Loading...'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Project Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        className="mt-1"
                      />
                      <p className={`text-xs mt-1 ${
                        editForm.title.length > 50 ? 'text-red-500' : 
                        editForm.title.length > 40 ? 'text-yellow-500' : 
                        'text-muted-foreground'
                      }`}>
                        {editForm.title.length}/50 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="brief">Project Brief</Label>
                      <Textarea
                        id="brief"
                        name="brief"
                        value={editForm.brief}
                        onChange={handleEditChange}
                        maxLength={100}
                        className="mt-1 resize-none min-h-[80px] max-h-[200px]"
                      />
                      <p className={`text-xs mt-1 ${
                        editForm.brief.length > 100 ? 'text-red-500' : 
                        editForm.brief.length > 80 ? 'text-yellow-500' : 
                        'text-muted-foreground'
                      }`}>
                        {editForm.brief.length}/100 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={editForm.status} 
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <div className="relative mt-1">
                        <Input
                          id="dueDate"
                          name="dueDate"
                          type="date"
                          value={editForm.dueDate}
                          onChange={handleEditChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                        <CalendarIcon 
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white cursor-pointer z-10" 
                          onClick={() => document.getElementById('dueDate').showPicker()}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveProject} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button onClick={cancelEditing} variant="outline" disabled={saving}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">{project.title}</CardTitle>
                      {project.isOwner && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <Crown className="w-3 h-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                    {project.brief && (
                      <CardDescription className="text-base mt-2">{project.brief}</CardDescription>
                    )}
                  </>
                )}
              </div>
              {!isEditing && project.isOwner && (
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-label="Project options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  
                  {showDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowDropdown(false)}
                      />
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-10 w-48 bg-popover border rounded-md shadow-lg z-50 py-1">
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            startEditing();
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Project
                        </button>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            openDeleteConfirm();
                          }}
                          disabled={deleting}
                          className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p className="text-sm font-semibold">{formatDate(project.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                  <p className="text-sm font-semibold">{project.members?.length || 0} members</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm font-semibold">{formatDate(project.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {project.progress !== undefined && (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Progress</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Auto-calculated from completed tasks
                    </p>
                  </div>
                  <div className="text-2xl font-semibold text-white">
                    {project.progress}%
                  </div>
                </div>

                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Progress updates automatically when you complete tasks</span>
                </div>
              </div>
            )}

            {/* Invite Section - Only for owners */}
            {project.isOwner && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Invite Clients
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a secure invite link to give clients access to this project. Links expire after 7 days.
                </p>
                
                {!inviteLink ? (
                  <Button onClick={generateInviteLink} disabled={generatingInvite}>
                    {generatingInvite ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Generate Invite Link
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={inviteLink} readOnly className="font-mono text-sm" />
                      <Button onClick={copyInviteLink} variant="outline">
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this link with clients to give them access to the project.
                    </p>
                    <Button onClick={() => setInviteLink(null)} variant="ghost" size="sm">
                      Generate New Link
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Team Members */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Team Members</h3>
              <div className="space-y-2">
                {project.members && project.members.length > 0 ? (
                  project.members.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name || member.email || member.userId}</p>
                          {member.email && member.name && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {member.role === 'owner' ? <Crown className="w-3 h-3 mr-1" /> : null}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No team members yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future features */}
        {/* Tasks, Files, Comments, and Invoices Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Project Workspace</CardTitle>
            <CardDescription>Manage tasks, invoices, and communicate with your team</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tasks" className="mt-6">
                <TasksTab projectId={projectId} project={project} />
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-6">
                <ProjectInvoiceList 
                  projectId={projectId} 
                  clients={project.members?.filter(m => m.role === 'client')} 
                />
              </TabsContent>
              
              <TabsContent value="files" className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">File Upload Coming Soon</p>
                  <p className="text-sm">
                    You'll be able to upload and manage project files here.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="comments" className="mt-6">
                <CommentsTab projectId={projectId} project={project} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-red-500 border-2">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                  <CardTitle className="text-red-600">Delete Project</CardTitle>
                  <CardDescription className="mt-2">
                    This will move the project to trash. It can be restored within 30 days before being permanently deleted.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Please type <strong>{project?.title}</strong> to confirm:
                </label>
                <Input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder="Type project name"
                  autoFocus
                  className="border-gray-300 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={closeDeleteConfirm}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteProjectHandler}
                  disabled={deleteConfirmInput !== project?.title || deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Moving to trash...' : 'Move to Trash'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
