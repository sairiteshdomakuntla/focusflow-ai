import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, TaskStatus } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Square, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function FocusView() {
  const { tasks, setTasks, sessions, setSessions, setCurrentMotivation } = useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [sessionStarted, setSessionStarted] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTasks = tasks.filter(t => t.status !== 'completed');

  const resetTimer = useCallback(() => {
    setTimeLeft(targetMinutes * 60);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [targetMinutes]);

  useEffect(() => {
    // Auto-select first in-progress task
    const ip = tasks.find(t => t.status === 'in_progress');
    if (ip) setSelectedTaskId(ip.id);
  }, [tasks]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      completeSession();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const startSession = async () => {
    if (!selectedTaskId) { toast.error('Select a task first'); return; }
    setSessionStarted(new Date());
    setIsRunning(true);
    setTimeLeft(targetMinutes * 60);
  };

  const completeSession = async () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedTaskId) return;

    const elapsed = sessionStarted ? Math.floor((Date.now() - sessionStarted.getTime()) / 60000) : targetMinutes;
    const { data, error } = await supabase.from('focus_sessions').insert({
      task_id: selectedTaskId, user_id: user.id,
      duration_minutes: elapsed, target_minutes: targetMinutes,
      breaks_taken: breaksTaken, completed: true, abandoned: false,
    }).select().single();

    if (!error && data) {
      setSessions([...sessions, data as any]);
      toast.success('Focus session completed! 🎉');
    }
    setBreaksTaken(0);
    setSessionStarted(null);
    resetTimer();
  };

  const abandonSession = async () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedTaskId) return;

    const elapsed = sessionStarted ? Math.floor((Date.now() - sessionStarted.getTime()) / 60000) : 0;
    await supabase.from('focus_sessions').insert({
      task_id: selectedTaskId, user_id: user.id,
      duration_minutes: elapsed, target_minutes: targetMinutes,
      breaks_taken: breaksTaken, completed: false, abandoned: true,
    });

    // Trigger AI motivation
    triggerMotivation('abandoned');
    toast.info('Session abandoned');
    setBreaksTaken(0);
    setSessionStarted(null);
    resetTimer();
  };

  const triggerMotivation = async (reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const task = tasks.find(t => t.id === selectedTaskId);
      const { data } = await supabase.functions.invoke('ai-motivation', {
        body: { userId: user.id, reason, taskTitle: task?.title || 'your task' },
      });
      if (data?.message) setCurrentMotivation(data.message);
    } catch { /* silent */ }
  };

  const takeBreak = () => {
    setBreaksTaken(prev => prev + 1);
    setIsRunning(false);
    toast.info('Break time! Take 5 minutes.');
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - (timeLeft / (targetMinutes * 60));

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Focus Session</h2>
        <p className="text-muted-foreground text-sm mt-1">Stay in the zone</p>
      </div>

      {/* Task Selector */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Select Task</label>
        <select
          value={selectedTaskId || ''}
          onChange={e => setSelectedTaskId(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Choose a task...</option>
          {activeTasks.map(t => (
            <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
          ))}
        </select>
      </div>

      {/* Timer Duration */}
      {!isRunning && !sessionStarted && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Duration (minutes)</label>
          <div className="flex items-center gap-2">
            {[15, 25, 45, 60].map(m => (
              <button
                key={m}
                onClick={() => { setTargetMinutes(m); setTimeLeft(m * 60); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  targetMinutes === m ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="relative flex items-center justify-center">
        <svg className="w-64 h-64 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(220, 15%, 18%)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="hsl(175, 80%, 50%)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-heading font-bold text-foreground tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          {isRunning && <span className="text-xs text-primary mt-2 animate-pulse">Focusing...</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRunning && !sessionStarted ? (
          <button
            onClick={startSession}
            className="flex items-center gap-2 px-8 py-3 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity animate-pulse-glow"
          >
            <Play className="w-5 h-5" /> Start Focus
          </button>
        ) : (
          <>
            <button onClick={() => setIsRunning(!isRunning)}
              className="p-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={takeBreak}
              className="p-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Coffee className="w-5 h-5" />
            </button>
            <button onClick={completeSession}
              className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Done
            </button>
            <button onClick={abandonSession}
              className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
              <Square className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Session Info */}
      {sessionStarted && (
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span>Breaks: {breaksTaken}</span>
          <span>Target: {targetMinutes}m</span>
        </div>
      )}
    </div>
  );
}
