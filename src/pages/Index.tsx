import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import Layout from '@/components/Layout';
import DashboardView from '@/components/DashboardView';
import TasksView from '@/components/TasksView';
import FocusView from '@/components/FocusView';
import AnalyticsView from '@/components/AnalyticsView';
import SettingsView from '@/components/SettingsView';
import Auth from './Auth';
import type { Task, FocusSession, MotivationSource } from '@/stores/appStore';

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { activeView, setTasks, setSessions, setMotivationSources } = useAppStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load user data
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [tasksRes, sessionsRes, motivRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
        supabase.from('motivation_sources').select('*').eq('user_id', user.id),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (sessionsRes.data) setSessions(sessionsRes.data as FocusSession[]);
      if (motivRes.data) setMotivationSources(motivRes.data as MotivationSource[]);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Auth />;

  const views = {
    dashboard: <DashboardView />,
    tasks: <TasksView />,
    focus: <FocusView />,
    analytics: <AnalyticsView />,
    settings: <SettingsView />,
  };

  return <Layout>{views[activeView]}</Layout>;
}
