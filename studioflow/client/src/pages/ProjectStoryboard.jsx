import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Storyboard from '../components/storyboard/Storyboard';
import { Button } from '../components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function ProjectStoryboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
        try {
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchProject();
  }, [projectId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground"> 
      {/* Header */}
      <div className="flex items-center gap-4 px-4 h-14 border-b bg-background z-10 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/projects/${projectId}`)} className="h-8 w-8 p-0 rounded-full">
            <ChevronLeft size={18} />
        </Button>
        <div className="flex flex-col">
            <h1 className="text-sm font-semibold leading-none text-foreground">{project?.title || 'Project'}</h1>
            <span className="text-xs text-muted-foreground">Storyboard</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <Storyboard projectId={projectId} />
      </div>
    </div>
  );
}
