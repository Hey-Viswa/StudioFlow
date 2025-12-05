import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Circle, 
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useProjectSocket } from '../hooks/useSocket';

export default function TasksTab({ projectId, project }) {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState([]);
  
  const userRole = project?.userRole || 'client';
  const isClient = userRole === 'client';
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    progress: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: null,
    dueDate: '',
    status: 'pending'
  });

  // Socket.IO callbacks for real-time task updates
  const handleTaskAdded = useCallback((data) => {
    console.log('🔔 Real-time task added:', data);
    setTasks(prev => [...prev, data.task]);
    // Recalculate stats
    fetchTasks();
  }, []);

  const handleTaskUpdated = useCallback((data) => {
    console.log('🔄 Real-time task updated:', data);
    setTasks(prev => prev.map(t => t._id === data.task._id ? data.task : t));
    // Recalculate stats
    fetchTasks();
  }, []);

  const handleTaskDeleted = useCallback((data) => {
    console.log('🗑️  Real-time task deleted:', data);
    setTasks(prev => prev.filter(t => t._id !== data.taskId));
    // Recalculate stats
    fetchTasks();
  }, []);

  // Connect to Socket.IO
  useProjectSocket(projectId, {
    onTaskAdded: handleTaskAdded,
    onTaskUpdated: handleTaskUpdated,
    onTaskDeleted: handleTaskDeleted
  });

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/tasks`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.tasks || []);
      
      // Update task statistics
      if (data.stats) {
        setTaskStats(data.stats);
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/tasks`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newTask)
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      const data = await response.json();
      setTasks([...tasks, data.task]);
      
      // Update project progress if returned
      if (data.progress !== undefined && project) {
        project.progress = data.progress;
      }
      
      // Refresh tasks to get updated stats
      await fetchTasks();
      
      setNewTask({ title: '', description: '', assignedTo: null, dueDate: '', status: 'pending' });
      setShowAddTask(false);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update task');
      
      const data = await response.json();
      
      // Update project progress if returned
      if (data.progress !== undefined && project) {
        project.progress = data.progress;
      }
      
      // Refresh tasks to get updated stats
      await fetchTasks();
      
      toast.success('Task updated!');
    } catch (error) {
      console.error('Update task error:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error('Failed to delete task');
      
      const data = await response.json();
      
      // Update project progress if returned
      if (data.progress !== undefined && project) {
        project.progress = data.progress;
      }
      
      // Refresh tasks to get updated stats
      await fetchTasks();
      
      toast.success('Task deleted!');
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('Failed to delete task');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'in-progress':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task Statistics */}
      {taskStats.total > 0 && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{taskStats.total}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{taskStats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{taskStats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{taskStats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tasks</h3>
          {taskStats.total > 0 && (
            <p className="text-sm text-muted-foreground">
              Progress: {taskStats.progress}% ({taskStats.completed}/{taskStats.total} completed)
            </p>
          )}
        </div>
        {!isClient && (
          <Button onClick={() => setShowAddTask(!showAddTask)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {showAddTask && !isClient && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input
                id="taskTitle"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="e.g., Assemble selects"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task details..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taskDueDate">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1',
                        !newTask.dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTask.dueDate ? format(new Date(newTask.dueDate), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                      onSelect={(date) => setNewTask({ ...newTask, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="taskStatus">Status</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(value) => setNewTask({ ...newTask, status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Task</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">{getStatusIcon(task.status)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                  {!isClient && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task._id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {task.assignedTo && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {task.assignedTo.name || task.assignedTo.email}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <Badge className={`${getStatusColor(task.status)} text-xs`}>
                    {task.status.replace('-', ' ')}
                  </Badge>
                </div>
                {!isClient ? (
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleUpdateTaskStatus(task._id, value)}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8 flex items-center">
                    <span className="text-xs text-muted-foreground">Status: {task.status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
