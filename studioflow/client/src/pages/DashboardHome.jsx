import { useUser } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardHome() {
  const { user } = useUser();

  // Mock data - will be replaced with real data later
  const projects = [
    {
      id: 1,
      title: 'Product Promo Reel',
      client: 'Nimbus Co.',
      progress: 64,
      status: 'In Progress',
      statusColor: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'Wedding Highlights',
      client: 'Carter Family',
      progress: 82,
      status: 'Review',
      statusColor: 'bg-purple-500',
    },
    {
      id: 3,
      title: 'Music Video Cut',
      client: 'Neon Wave',
      progress: 30,
      status: 'Blocked',
      statusColor: 'bg-red-500',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome, {user?.firstName || 'User'}
          </h1>
          <p className="text-gray-400">Let's make something amazing today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects"
              className="pl-10 w-64 bg-[#1e293b] border-[#334155] text-white placeholder:text-gray-500"
            />
          </div>
          <Link to="/dashboard/projects/new">
            <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
              Create New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} to={`/dashboard/projects/${project.id}`}>
            <Card className="bg-[#1e293b] border-[#334155] hover:border-primary/50 transition-all cursor-pointer group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-gray-400">Client: {project.client}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${project.statusColor} text-white border-none`}
                  >
                    {project.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
