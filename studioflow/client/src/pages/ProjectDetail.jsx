import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Card } from '../components/ui/card';
import { ChevronLeft, Plus, Upload, Share2 } from 'lucide-react';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data
  const project = {
    name: 'Product Promo Reel',
    id: 'PR-1021',
    client: 'Nimbus Co.',
    status: 'Active',
    due: 'Sep 30',
    description: 'Creating a sleek 45s promo for the new product launch. Include motion graphics and upbeat soundtrack.',
  };

  const tasks = [
    { id: 1, name: 'Assemble selects', assignee: 'Sam', avatar: '👤', due: 'Sep 12', status: 'On Track', statusColor: 'bg-green-500' },
    { id: 2, name: 'First rough cut', assignee: 'Jamie', avatar: '👤', due: 'Sep 15', status: 'At Risk', statusColor: 'bg-yellow-500' },
  ];

  const files = [
    { id: 1, name: 'Brand_assets.zip', version: 'v1', uploader: 'Taylor', avatar: '👤' },
    { id: 2, name: 'promo_cut_v2.mp4', version: 'v2', uploader: 'Riley', avatar: '👤' },
  ];

  const comments = [
    { id: 1, user: 'Sam', avatar: '👤', text: "Looks great. Let's tighten the first 5 seconds.", time: 'Today, 10:14' },
    { id: 2, user: 'Jamie', avatar: '👤', text: 'Uploaded new graphics pack.', time: 'Yesterday, 17:22' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'files', label: 'Files' },
    { id: 'comments', label: 'Comments' },
    { id: 'invoice', label: 'Invoice' },
  ];

  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#0f1420] border-r border-[#1e293b] flex flex-col">
        <div className="p-6 border-b border-[#1e293b]">
          <Link to="/dashboard/projects" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to Projects</span>
          </Link>
          <h2 className="text-lg font-semibold text-white mb-1">{project.name}</h2>
          <p className="text-sm text-gray-400">{project.client} • Due {project.due}</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1e293b] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a2332]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{project.status}</Badge>
              </div>
            </div>
            <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Overview Section */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card className="bg-[#1e293b] border-[#334155]">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Overview</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Client</p>
                      <p className="text-white font-medium">{project.client}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Due</p>
                      <p className="text-white font-medium">{project.due}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{project.description}</p>
                </div>
              </Card>
            </div>
          )}

          {/* Tasks Section */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Tasks</h2>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="bg-[#1e293b] border-[#334155] hover:border-primary/50 transition-colors">
                    <div className="p-4 flex items-center gap-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-transparent" />
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 bg-[#334155] flex items-center justify-center text-white text-xs">
                          {task.avatar}
                        </Avatar>
                        <span className="text-sm text-gray-400">{task.assignee}</span>
                      </div>
                      <div className="text-sm text-gray-400">Due {task.due}</div>
                      <Badge className={`${task.statusColor}/20 text-${task.statusColor.replace('bg-', '')} border-${task.statusColor.replace('bg-', '')}/30`}>
                        {task.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {activeTab === 'files' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Files</h2>
                <Button className="bg-primary hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
              <div className="space-y-3">
                {files.map((file) => (
                  <Card key={file.id} className="bg-[#1e293b] border-[#334155] hover:border-primary/50 transition-colors">
                    <div className="p-4 flex items-center gap-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-transparent" />
                      <div className="flex-1">
                        <p className="text-white font-medium">{file.name}</p>
                      </div>
                      <div className="text-sm text-gray-400">{file.version}</div>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 bg-[#334155] flex items-center justify-center text-white text-xs">
                          {file.avatar}
                        </Avatar>
                        <span className="text-sm text-gray-400">{file.uploader}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          {activeTab === 'comments' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Comments</h2>
              <Card className="bg-[#1e293b] border-[#334155] mb-4">
                <div className="p-4 flex items-start gap-3">
                  <Avatar className="w-10 h-10 bg-[#334155] flex items-center justify-center text-white text-sm">
                    👤
                  </Avatar>
                  <Textarea
                    placeholder="Write a comment..."
                    className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 focus-visible:ring-0 resize-none"
                    rows={1}
                  />
                </div>
              </Card>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id} className="bg-[#1e293b] border-[#334155]">
                    <div className="p-4 flex items-start gap-3">
                      <Avatar className="w-10 h-10 bg-[#334155] flex items-center justify-center text-white text-sm">
                        {comment.avatar}
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white mb-1">{comment.text}</p>
                        <p className="text-xs text-gray-500">{comment.time}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
