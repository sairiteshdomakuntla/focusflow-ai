import { useAppStore } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertTriangle, TrendingUp, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import MotivationPrompt from './MotivationPrompt';

const mockWeeklyData = [
  { day: 'Mon', focus: 120, tasks: 4 },
  { day: 'Tue', focus: 90, tasks: 3 },
  { day: 'Wed', focus: 150, tasks: 5 },
  { day: 'Thu', focus: 60, tasks: 2 },
  { day: 'Fri', focus: 180, tasks: 6 },
  { day: 'Sat', focus: 45, tasks: 1 },
  { day: 'Sun', focus: 30, tasks: 1 },
];

const statCards = [
  { label: 'Focus Today', value: '2h 15m', icon: Clock, color: 'text-primary' },
  { label: 'Tasks Done', value: '4/7', icon: CheckCircle2, color: 'text-success' },
  { label: 'Procrastination Score', value: '32%', icon: AlertTriangle, color: 'text-warning' },
  { label: 'Weekly Streak', value: '5 days', icon: Flame, color: 'text-destructive' },
];

export default function DashboardView() {
  const { tasks, sessions } = useAppStore();

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);

  const dynamicStats = [
    { label: 'Focus Today', value: `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m`, icon: Clock, color: 'text-primary' },
    { label: 'Tasks Done', value: `${completedTasks}/${tasks.length || 0}`, icon: CheckCircle2, color: 'text-success' },
    { label: 'Pending', value: `${pendingTasks}`, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Sessions', value: `${sessions.length}`, icon: TrendingUp, color: 'text-info' },
  ];

  const displayStats = tasks.length > 0 ? dynamicStats : statCards;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">Your productivity at a glance</p>
      </div>

      <MotivationPrompt />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-xl p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Weekly Focus Time (min)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockWeeklyData}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: 'hsl(210 20% 92%)' }}
              />
              <Bar dataKey="focus" fill="hsl(175, 80%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Tasks Completed</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockWeeklyData}>
              <XAxis dataKey="day" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 18%)', borderRadius: '8px', color: 'hsl(210 20% 92%)' }}
              />
              <Area type="monotone" dataKey="tasks" stroke="hsl(260, 60%, 60%)" fill="hsl(260, 60%, 60%, 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
