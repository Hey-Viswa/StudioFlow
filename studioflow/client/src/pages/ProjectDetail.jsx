import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../lib/api'; // Import standardized API client
import { useProjectSocket } from '../hooks/useSocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
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
import TimeTrackingTab from '../components/TimeTrackingTab';
import CommentsTab from '../components/CommentsTab';
import CommentThread from '../components/CommentThread';
import ActivityTab from '../components/ActivityTab';
import { useComments } from '../hooks/useComments';
import ProjectInvoiceList from '../components/ProjectInvoiceList';
import { ProjectFilesPanel } from '../components/files/ProjectFilesPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  Share2,
  CheckCircle2,
  Copy,
  Activity,
  Clock,
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
  MoreVertical,
  RefreshCw,
  ArrowRightLeft,
  Settings,
  Map,
  Maximize2
} from 'lucide-react';
import Storyboard from '../components/storyboard/Storyboard';
import { ShimmerProjectDetail } from '../components/skeletons/ShimmerProjectDetail';
import OwnershipTransferModal from '../components/OwnershipTransferModal';
import OwnershipAcceptanceBanner from '../components/OwnershipAcceptanceBanner';
import ProjectHeader from '../components/ProjectHeader';
import ProjectStats from '../components/ProjectStats';
import TeamTab from '../components/TeamTab';
import BillingSettings from '../components/projects/BillingSettings';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comment System 2.0 integration
  const {
    comments,
    loading: commentsLoading,
    addComment,
    replyToComment,
    editComment,
    deleteComment,
    reactToComment,
    resolveComment
  } = useComments(projectId);

  const [inviteLink, setInviteLink] = useState(null);
  const [inviteRole, setInviteRole] = useState('client');
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
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [ownershipEventTick, setOwnershipEventTick] = useState(0);

  // Tab State Management (New)
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';
  const [activeTab, setActiveTabRaw] = useState(initialTab);

  // Sync state with URL
  const setActiveTab = (value) => {
    setActiveTabRaw(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabRaw(tabFromUrl);
    }
  }, [searchParams]);

  // Automatically populate edit form when entering settings tab
  useEffect(() => {
    if (activeTab === 'settings' && project) {
      setEditForm({
        title: project.title || '',
        brief: project.brief || '',
        status: project.status || 'active',
        progress: project.progress || 0,
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''
      });
    }
  }, [activeTab, project]);

  // Update startEditing to switch tab
  const startEditing = () => {
    setEditForm({
      title: project?.title || '',
      brief: project?.brief || '',
      status: project?.status || 'active',
      progress: project?.progress || 0,
      dueDate: project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''
    });
    setIsEditing(true);
    setActiveTab('settings');
  };

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

      if (!data.project) {
        console.error('Invalid project data structure:', data);
        throw new Error('Project data is missing from response');
      }

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
      // console.log('📡 Project updated via socket:', data);
      toast.info('Project updated by another user');
      // Small delay to ensure DB propagation
      setTimeout(() => fetchProject(), 500);
    },
    onMemberJoined: (data) => {
      // console.log('📡 New member joined:', data);
      toast.success(`${data.member.name || 'Someone'} joined the project`);
      fetchProject();
    },
    onCommentAdded: (data) => {
      // console.log('📡 New comment added:', data);
      // CommentsTab will handle this
    },
    onTaskAdded: (data) => {
      // console.log('📡 New task added:', data);
      // TasksTab will handle this
    },
    onTaskUpdated: (data) => {
      // console.log('📡 Task updated:', data);
      fetchProject(); // Refresh to get updated progress
    },
    onTaskDeleted: (data) => {
      // console.log('📡 Task deleted:', data);
      fetchProject(); // Refresh KPIs/progress after removals
    },
    onOwnershipRequest: (data) => {
      // console.log('📡 Ownership request created:', data);
      toast.info('Ownership transfer requested');
      setOwnershipEventTick((v) => v + 1);
    },
    onOwnershipAccepted: (data) => {
      // console.log('📡 Ownership transfer accepted:', data);
      toast.success('Ownership transfer accepted');
      setOwnershipEventTick((v) => v + 1);
      fetchProject();
    },
    onOwnershipCancelled: (data) => {
      // console.log('📡 Ownership transfer cancelled:', data);
      toast.message('Ownership transfer request cancelled');
      setOwnershipEventTick((v) => v + 1);
    }
  });

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const generateInviteLink = async (role) => {
    setGeneratingInvite(true);
    try {
      const token = await getToken();
      const data = await api.post(`/projects/${projectId}/invite`, { role: role || inviteRole }, { getToken });
      setInviteLink(data.inviteLink);
      setCopied(false);
      // Use the passed role argument, fallback to state if needed
      const roleName = (role || inviteRole) === 'client' ? 'Client' : 'Team';
      toast.success(`${roleName} invite link generated!`);
    } catch (err) {
      console.error('Generate invite error:', err);
      toast.error('Failed to generate invite link');
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

  const handleRemoveMember = async (memberUserId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const token = await getToken();
      await api.delete(`/projects/${projectId}/members/${memberUserId}`, { getToken });

      toast.success('Member removed successfully');
      await fetchProject();
    } catch (err) {
      console.error('Remove member error:', err);
      toast.error('Failed to remove member');
    }
  };




  // startEditing is defined below to use setActiveTab

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
      // Prepare update data
      const updateData = {
        title: editForm.title,
        brief: editForm.brief,
        status: editForm.status,
        progress: editForm.progress,
        dueDate: editForm.dueDate || null
      };

      const response = await api.put(`/projects/${projectId}`, updateData, { getToken });

      setProject(response.project);
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
      await api.delete(`/projects/${projectId}`, { getToken });

      // Redirect to dashboard after successful deletion
      toast.success('Project deleted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Delete project error:', err);
      toast.error(err.message || 'Failed to delete project');
      setDeleting(false);
    }
  };

  const requestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }

    setSubmittingRevision(true);
    try {
      const token = await getToken();
      await api.put(`/projects/${projectId}`, {
        status: 'needs-revision',
        revisionNotes: revisionNotes
      }, { getToken });

      toast.success('Revision requested successfully!');
      setShowRevisionModal(false);
      setRevisionNotes('');
      await fetchProject();
    } catch (err) {
      console.error('Request revision error:', err);
      toast.error(err.message || 'Failed to request revision');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const approveFinal = async () => {
    try {
      const token = await getToken();
      await api.patch(`/projects/${projectId}`, {
        status: 'completed',
        finalizedAt: new Date().toISOString()
      }, { getToken });

      toast.success('Project approved successfully! 🎉');
      setShowApproveModal(false);
      await fetchProject();
    } catch (err) {
      console.error('Approve final error:', err);
      toast.error(err.message || 'Failed to approve project');
    }
  };

  const updateProjectProgress = async () => {
    setUpdatingProgress(true);
    try {
      // console.log('📊 Updating progress:', { projectId, progressValue });
      const token = await getToken();
      // Automatically set status to 'completed' if progress is 100%
      const updateData = { progress: progressValue };
      if (progressValue === 100) {
        updateData.status = 'completed';
      }

      await api.patch(`/projects/${projectId}`, updateData, { getToken });

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
      archived: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
      'needs-revision': 'bg-red-500/20 text-red-500 border-red-500/30',
      finalized: 'bg-green-600/20 text-green-600 border-green-600/30'
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

  // Loading State - Shimmer Effect
  if (loading) {
    return <ShimmerProjectDetail />;
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Error Loading Project</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Not Found State
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <Home className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Project Not Found</h3>
        <p className="text-muted-foreground mb-4">The project you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => navigate('/dashboard/projects')}>Back to Projects</Button>
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

  const isOwner = project?.ownerId === userId || project?.userRole === 'owner';
  const userRole = project?.userRole || (project?.ownerId === userId ? 'owner' : project?.members?.find(m => m.userId === userId)?.role);

  const taskStats = project?.stats?.tasks || {
    total: 0,
    completed: 0,
    pending: 0
  };

  const invoiceStats = project?.invoiceStats || {
    pendingCount: 0,
    overdueCount: 0
  };

  return (
    <div className="space-y-6 pb-20 fade-in p-6 max-w-screen-xl mx-auto">
      <ProjectHeader
        project={project}
        userRole={project.userRole}
        onInvite={project.userRole === 'owner' ? () => setActiveTab('team') : null}
        onEdit={startEditing}
        onTransferOwnership={() => setShowTransferModal(true)}
        onRequestRevision={() => setShowRevisionModal(true)}
        onApproveFinal={() => setShowApproveModal(true)}
      />

      {/* ... (Stats Section) ... */}
      <ProjectStats
        project={project}
        taskStats={taskStats}
        invoiceStats={invoiceStats}
      />

      {/* 3. Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto flex-wrap gap-1 mb-6">
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-2">
            <Clock className="h-4 w-4" /> Time
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <Upload className="h-4 w-4" /> Files
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Comments
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{comments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" /> Activity
          </TabsTrigger>

          {/* Feature Flagged Storyboard */}

          {/* Feature Flagged Storyboard - Enabled by default for testing */}


          <div className="flex-1 min-w-4" />

          <TabsTrigger value="team" id="team-tab-trigger" className="gap-2">
            <Users className="h-4 w-4" /> Team
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="settings" className="gap-2 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-none shadow-none bg-transparent">
              <TasksTab projectId={projectId} project={project} userRole={userRole} />
            </Card>
          </TabsContent>

          <TabsContent value="time" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TimeTrackingTab projectId={projectId} userRole={userRole} />
          </TabsContent>

          <TabsContent value="invoices" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProjectInvoiceList
              projectId={projectId}
              userRole={userRole}
              clients={project.members?.filter(m => m.role === 'client')}
            />
          </TabsContent>

          <TabsContent value="files" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProjectFilesPanel projectId={projectId} project={project} />
          </TabsContent>

          <TabsContent value="comments" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CommentThread
              comments={comments}
              projectMembers={project.members || []}
              projectId={projectId}
              currentUserId={userId}
              currentUser={user}
              onAddComment={addComment}
              onReply={replyToComment}
              onEdit={editComment}
              onDelete={deleteComment}
              onReact={reactToComment}
              onResolve={resolveComment}
              canModerate={project.owner === userId || project.members?.some(m => m.userId === userId && m.role === 'owner')}
              loading={commentsLoading}
              maxNestingLevel={3}
            />
          </TabsContent>

          <TabsContent value="activity" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ActivityTab projectId={projectId} />
          </TabsContent>




          <TabsContent value="team" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TeamTab
              project={project}
              members={project.members || []}
              isOwner={isOwner}
              onGenerateInvite={generateInviteLink}
              onRemoveMember={handleRemoveMember}
              inviteLink={inviteLink}
              generatingInvite={generatingInvite}
              copied={copied}
              setCopied={setCopied}
            />
          </TabsContent>

          {isOwner && (
            <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Project Settings</CardTitle>
                  <CardDescription>Manage project details and danger zone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Project Title</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.brief}
                        onChange={(e) => setEditForm({ ...editForm, brief: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    {isEditing && (
                      <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                        Cancel
                      </Button>
                    )}

                    {!isEditing ? (
                      <Button onClick={startEditing}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                      </Button>
                    ) : (
                      <Button onClick={saveProject} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Billing Settings */}
              <div className="mt-8">
                <BillingSettings projectId={projectId} />
              </div>

              {/* Danger Zone */}
              <Card className="border-destructive/20 bg-destructive/5 mt-8">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="justify-start text-destructive hover:text-destructive" onClick={() => setShowTransferModal(true)}>
                      <Crown className="w-4 h-4 mr-2" /> Transfer Ownership
                    </Button>
                    <Button variant="destructive" className="justify-start" onClick={openDeleteConfirm}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </div>
      </Tabs>

      {/* Modals */}
      <OwnershipTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        project={project}
        refreshKey={ownershipEventTick}
        onSuccess={() => {
          fetchProject();
          setShowTransferModal(false);
        }}
      />

      <OwnershipAcceptanceBanner
        projectId={project._id}
        refreshKey={ownershipEventTick}
        onAccept={fetchProject}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-red-500 border-2">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <CardTitle className="text-red-600">Delete Project</CardTitle>
                  <CardDescription>
                    This action cannot be undone. This will permanently delete the project
                    <span className="font-semibold text-foreground"> {project?.title} </span>
                    and all associated data.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <span className="font-mono font-bold">{project?.title}</span> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  className="border-red-200 focus-visible:ring-red-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={closeDeleteConfirm}>Cancel</Button>
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

      {/* Request Revision Modal */}
      {showRevisionModal && (
        <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-500" />
                Request Revision
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Explain what needs to be changed or improved in this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Describe the changes you'd like to see..."
                className="min-h-[120px] bg-background border-border focus:ring-orange-500"
                maxLength={500}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {revisionNotes.length}/500 characters
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={requestRevision}
                disabled={!revisionNotes.trim() || submittingRevision}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {submittingRevision ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Final Modal */}
      {showApproveModal && (
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Approve Final Version
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Confirm that you approve the final version of {project?.title}. This will mark the project as completed.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-emerald-500">Final Approval</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  By approving, you confirm that all requirements have been met and the project is complete.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={approveFinal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Final
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
