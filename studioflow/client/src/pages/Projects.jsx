import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Search, Plus } from 'lucide-react';

export default function Projects() {
  const [viewMode, setViewMode] = useState('table');

  // Mock data
  const projects = [
    {
      id: 'PR-1021',
      name: 'Product Promo Reel',
      client: 'Nimbus Co.',
      status: 'In Progress',
      progress: 64,
      due: 'Sep 30',
    },
    {
      id: 'WH-0892',
      name: 'Wedding Highlights',
      client: 'Carter Family',
      status: 'Review',
      progress: 82,
      due: 'Sep 12',
    },
    {
      id: 'MV-0774',
      name: 'Music Video Cut',
      client: 'Neon Wave',
      status: 'Blocked',
      progress: 30,
      due: 'Oct 05',
    },
    {
      id: 'CI-0651',
      name: 'Corporate Interviews',
      client: 'Acme Ltd.',
      status: 'In Progress',
      progress: 45,
      due: 'Sep 28',
    },
  ];

  const statusConfig = {
    'In Progress': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'Review': { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'Blocked': { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const groupedProjects = {
    'In Progress': projects.filter(p => p.status === 'In Progress'),
    'Review': projects.filter(p => p.status === 'Review'),
    'Blocked': projects.filter(p => p.status === 'Blocked'),
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Projects</h1>
          <p className="text-gray-400">
            <span className="text-white font-medium">24</span> active
          </p>
        </div>
        <Link to="/dashboard/projects/new">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search projects"
            className="pl-10 bg-[#1e293b] border-[#334155] text-white placeholder:text-gray-500"
          />
        </div>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
          Status
        </Button>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
          Client
        </Button>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
          Sort by
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? 'bg-primary' : 'bg-[#1e293b] border-[#334155] text-gray-300'}
        >
          Table View
        </Button>
        <Button
          variant={viewMode === 'board' ? 'default' : 'outline'}
          onClick={() => setViewMode('board')}
          className={viewMode === 'board' ? 'bg-primary' : 'bg-[#1e293b] border-[#334155] text-gray-300'}
        >
          Board View
        </Button>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-[#0f1420] border border-[#1e293b] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1e293b]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Progress</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-[#1e293b]/50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{project.name}</div>
                      <div className="text-xs text-gray-500">ID: {project.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{project.client}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={statusConfig[project.status].color}>
                      {project.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Progress value={project.progress} className="h-2 w-24" />
                      <span className="text-sm text-gray-300 font-medium">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{project.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div>
          <p className="text-sm text-gray-400 mb-6">Quick glance of statuses</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(groupedProjects).map(([status, statusProjects]) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{status}</h3>
                  <Badge variant="outline" className="bg-[#1e293b] text-gray-400 border-[#334155]">
                    {statusProjects.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {statusProjects.map((project) => (
                    <Card key={project.id} className="bg-[#1e293b] border-[#334155] hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="p-4">
                        <h4 className="text-base font-semibold text-white mb-2">{project.name}</h4>
                        <p className="text-sm text-gray-400 mb-3">{project.client} • Due {project.due}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress} className="h-2 flex-1" />
                          <span className="text-xs text-primary font-medium">{project.progress}%</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-400">Showing 1–10 of 24</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300">
            Previous
          </Button>
          <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
