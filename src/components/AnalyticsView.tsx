import { useAppStore } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['hsl(175, 80%, 50%)', 'hsl(260, 60%, 60%)', 'hsl(40, 90%, 55%)', 'hsl(0, 70%, 55%)'];

export default function AnalyticsView() {
  const { tasks, sessions } = useAppStore();

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  const taskStatusData = [
    { name: 'Completed', value: completedTasks || 1 },
    { name: 'Pending', value: pendingTasks || 1 },
    { name: 'In Progress', value: inProgressTasks || 1 },
  ];

  const totalFocus = sessions.reduce((a, s) => a + s.duration_minutes, 0);
  const completedSessions = sessions.filter(s => s.completed).length;
  const abandonedSessions = sessions.filter(s => s.abandoned).length;
  const abandonRate = sessions.length > 0 ? Math.round((abandonedSessions / sessions.length) * 100) : 0;

  // Procrastination: avg delay between task creation and first session start
  const delays = tasks.map(t => {
    if (!t.started_at) return null;
    return (new Date(t.started_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
  }).filter(Boolean) as number[];
  const avgDelay = delays.length > 0 ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1) : 'N/A';

  // Priority distribution
  const priorityData = [
    { name: 'High', count: tasks.filter(t => t.priority === 'high').length },
    { name: 'Medium', count: tasks.filter(t => t.priority === 'medium').length },
    { name: 'Low', count: tasks.filter(t => t.priority === 'low').length },
  ];

  // Weekly mock productivity score
  const weeklyScore = [
    { week: 'W1', score: 65 }, { week: 'W2', score: 72 },
    { week: 'W3', score: 58 }, { week: 'W4', score: 80 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground text-sm mt-1">Procrastination & productivity insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Focus', value: `${Math.floor(totalFocus / 60)}h ${totalFocus % 60}m` },
          { label: 'Sessions', value: `${completedSessions}/${sessions.length}` },
          { label: 'Abandon Rate', value: `${abandonRate}%` },
          { label: 'Avg Start Delay', value: avgDelay === 'N/A' ? 'N/A' : `${avgDelay}h` },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className="text-xl font-heading font-bold text-foreground mt-1">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: 'hsl(210 20% 92%)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {taskStatusData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /> {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Priority Bar */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: 'hsl(210 20% 92%)' }} />
              <Bar dataKey="count" fill="hsl(260, 60%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Productivity Score */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card lg:col-span-2">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Weekly Productivity Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyScore}>
              <XAxis dataKey="week" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: 'hsl(210 20% 92%)' }} />
              <Line type="monotone" dataKey="score" stroke="hsl(175, 80%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(175, 80%, 50%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
