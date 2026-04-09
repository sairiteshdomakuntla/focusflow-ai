import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Sparkles } from 'lucide-react';

export default function SettingsView() {
  const { motivationSources, setMotivationSources } = useAppStore();
  const [newSource, setNewSource] = useState('');

  const addSource = async () => {
    if (!newSource.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('motivation_sources').insert({
      user_id: user.id, text: newSource.trim(),
    }).select().single();
    if (error) { toast.error('Failed to add'); return; }
    setMotivationSources([...motivationSources, data as any]);
    setNewSource('');
    toast.success('Motivation source added');
  };

  const removeSource = async (id: string) => {
    await supabase.from('motivation_sources').delete().eq('id', id);
    setMotivationSources(motivationSources.filter(s => s.id !== id));
    toast.success('Removed');
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Personalize your motivation engine</p>
      </div>

      {/* Motivation Sources */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground text-sm">Motivation Sources</h3>
        </div>
        <p className="text-xs text-muted-foreground">Tell us what drives you. The AI will use these to craft personalized motivation when you procrastinate.</p>

        <div className="flex gap-2">
          <input
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSource()}
            placeholder='e.g. "I want to become a great engineer"'
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={addSource}
            className="p-2 rounded-lg gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {motivationSources.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2">
              <span className="text-sm text-foreground flex-1">"{s.text}"</span>
              <button onClick={() => removeSource(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {motivationSources.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No motivation sources yet. Add what drives you!</p>
          )}
        </div>
      </div>
    </div>
  );
}
