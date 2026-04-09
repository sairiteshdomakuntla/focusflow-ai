import { useState } from 'react';
import { useAppStore, Task, TaskPriority, TaskDifficulty, TaskStatus } from '@/stores/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, CheckCircle2, Clock, Edit2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-info/15 text-info',
  medium: 'bg-warning/15 text-warning',
  high: 'bg-destructive/15 text-destructive',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  in_progress: <Play className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
};

export default function TasksView() {
  const { tasks, setTasks, setActiveView } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as TaskPriority,
    difficulty: 'medium' as TaskDifficulty, deadline: '', status: 'pending' as TaskStatus,
  });

  const resetForm = () => {
    setForm({ title: '', description: '', priority: 'medium', difficulty: 'medium', deadline: '', status: 'pending' });
    setEditingTask(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTask) {
      const { error } = await supabase.from('tasks').update({
        title: form.title, description: form.description, priority: form.priority,
        difficulty: form.difficulty, deadline: form.deadline || null, status: form.status,
      }).eq('id', editingTask.id);
      if (error) { toast.error('Failed to update'); return; }
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...form } : t));
      toast.success('Task updated');
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title: form.title, description: form.description, priority: form.priority,
        difficulty: form.difficulty, deadline: form.deadline || null, status: form.status,
        user_id: user.id,
      }).select().single();
      if (error) { toast.error('Failed to create'); return; }
      setTasks([...tasks, data as Task]);
      toast.success('Task created');
    }
    resetForm();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
    toast.success('Task deleted');
  };

  const startEditing = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title, description: task.description, priority: task.priority,
      difficulty: task.difficulty, deadline: task.deadline || '', status: task.status,
    });
    setShowForm(true);
  };

  const startFocus = (task: Task) => {
    // Update task to in_progress
    supabase.from('tasks').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', task.id).then(() => {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'in_progress' as TaskStatus, started_at: new Date().toISOString() } : t));
    });
    setActiveView('focus');
  };

  const grouped = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Tasks</h2>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} total tasks</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Task Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-foreground">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <input
                placeholder="Task title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as TaskDifficulty })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                {editingTask && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
              <button onClick={handleSubmit}
                className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Lists */}
      {(['in_progress', 'pending', 'completed'] as const).map(status => (
        grouped[status].length > 0 && (
          <div key={status} className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {status.replace('_', ' ')} ({grouped[status].length})
            </h3>
            {grouped[status].map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 group hover:border-primary/30 transition-colors shadow-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${status === 'completed' ? 'text-success' : status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {statusIcons[status]}
                    </span>
                    <h4 className={`text-sm font-medium text-foreground truncate ${status === 'completed' ? 'line-through opacity-60' : ''}`}>{task.title}</h4>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                    <span className="text-xs text-muted-foreground">{task.difficulty}</span>
                    {task.deadline && <span className="text-xs text-muted-foreground">Due: {new Date(task.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {status !== 'completed' && (
                    <button onClick={() => startFocus(task)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => startEditing(task)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ))}

      {tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks yet. Create your first task to get started!</p>
        </div>
      )}
    </div>
  );
}

function ListTodo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>
    </svg>
  );
}
