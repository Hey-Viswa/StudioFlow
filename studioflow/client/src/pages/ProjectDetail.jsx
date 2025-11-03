import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft,
  Loader2,
  Share2,
  CheckCircle2,
  Copy,
  Calendar,
  Users,
  FileText,
  Crown
} from 'lucide-react';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('Project not found');
        if (response.status === 403) throw new Error('You don\'t have access to this project');
        throw new Error('Failed to load project');
      }

      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      console.error('Fetch project error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    setGeneratingInvite(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate invite' }));
        throw new Error(errorData.error || 'Failed to generate invite');
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);
    } catch (err) {
      console.error('Generate invite error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
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
                          <p className="text-sm font-medium">{member.userId}</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Tasks & Updates</CardTitle>
            <CardDescription>Coming soon: Track project tasks and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will allow you to manage tasks, upload files, and communicate with your team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
