import { useState } from 'react';
import { useAppStore, PredictionInput, PredictionResult, TaskDifficulty, TaskPriority } from '@/stores/appStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Brain, BellRing, Binary, Gauge, Sparkles } from 'lucide-react';

const priorityEncoding: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const difficultyEncoding: Record<TaskDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const categoryEncodingMap: Record<string, number> = {
  work: 1,
  study: 2,
  health: 3,
  personal: 4,
  finance: 5,
  other: 6,
};

function normalizeCategory(input: string) {
  const value = input.trim().toLowerCase();
  if (!value) return 'other';
  return value;
}

function standardizeComplexity(complexity: number) {
  // Simple scaling to [0, 1] from expected range [1, 10].
  return (complexity - 1) / 9;
}

function runModelInference(input: PredictionInput): PredictionResult {
  const normalizedCategory = normalizeCategory(input.category);
  const encodedCategory = categoryEncodingMap[normalizedCategory] ?? categoryEncodingMap.other;
  const encodedPriority = priorityEncoding[input.priority];
  const encodedDifficulty = difficultyEncoding[input.difficulty];
  const standardizedComplexity = standardizeComplexity(input.complexity);

  const focusDurationMinutes = Math.max(
    15,
    Math.round(20 + standardizedComplexity * 35 + encodedPriority * 6 + encodedDifficulty * 4),
  );

  const completionScore = encodedPriority * 0.35 + encodedDifficulty * 0.2 + standardizedComplexity * 0.45;
  const statusClassification = completionScore >= 2.1 ? 'in_progress' : 'completed';

  const motivationTriggered = encodedPriority >= 3 && standardizedComplexity >= 0.55;
  const motivationReason = motivationTriggered
    ? 'High priority and high complexity detected. Motivation trigger is recommended.'
    : 'No motivation trigger required for current priority and complexity.';

  return {
    serialized: input,
    encoded: {
      priority: encodedPriority,
      difficulty: encodedDifficulty,
      category: encodedCategory,
    },
    standardized: {
      complexity: Number(standardizedComplexity.toFixed(3)),
    },
    inference: {
      focusDurationMinutes,
      statusClassification,
    },
    motivationTriggered,
    motivationReason,
    createdAt: new Date().toISOString(),
  };
}

export default function PredictionView() {
  const { latestPrediction, setLatestPrediction, motivationSources } = useAppStore();
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [form, setForm] = useState<PredictionInput>({
    taskName: '',
    priority: 'medium',
    difficulty: 'medium',
    category: '',
    complexity: 5,
  });

  const sendMotivationEmail = async (prediction: PredictionResult) => {
    const { error } = await supabase.functions.invoke('send-motivation-email', {
      body: {
        reason: 'prediction_trigger',
        taskTitle: prediction.serialized.taskName,
        priority: prediction.serialized.priority,
        difficulty: prediction.serialized.difficulty,
        category: prediction.serialized.category,
        complexity: prediction.serialized.complexity,
        predictedFocusMinutes: prediction.inference.focusDurationMinutes,
        predictedStatus: prediction.inference.statusClassification,
        motivationReason: prediction.motivationReason,
        motivationSources: motivationSources.map((source) => source.text),
      },
    });

    if (error) {
      setEmailStatus('failed');
      toast.error(error.message || 'Failed to send motivation email');
      return;
    }

    setEmailStatus('sent');
    toast.success('Motivation email sent');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus('idle');

    const prediction = runModelInference({
      ...form,
      taskName: form.taskName.trim(),
      category: form.category.trim(),
      complexity: Math.min(10, Math.max(1, Number(form.complexity) || 1)),
    });
    setLatestPrediction(prediction);

    if (prediction.motivationTriggered) {
      await sendMotivationEmail(prediction);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground">Prediction</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter task fields and get model outcomes instantly</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">Data Entry (UI)</h3>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Task Name</label>
            <input
              value={form.taskName}
              onChange={(e) => setForm({ ...form, taskName: e.target.value })}
              required
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter task name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as TaskDifficulty })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Work, Study, Health..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Complexity (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.complexity}
                onChange={(e) => setForm({ ...form, complexity: Number(e.target.value) })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Predict Outcome
          </button>
        </form>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">Dashboard Response</h3>

          {!latestPrediction ? (
            <p className="text-sm text-muted-foreground">No prediction yet. Submit task fields to view outcomes.</p>
          ) : (
            <>
              <div className="rounded-lg border border-border p-3 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Binary className="w-3.5 h-3.5" /> Serialization (JSON)
                </p>
                <pre className="text-xs text-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(latestPrediction.serialized, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Label Encoding
                  </p>
                  <p className="text-xs text-foreground">
                    Priority: {latestPrediction.encoded.priority}, Difficulty: {latestPrediction.encoded.difficulty}, Category: {latestPrediction.encoded.category}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" /> Standardization
                  </p>
                  <p className="text-xs text-foreground">Complexity (scaled): {latestPrediction.standardized.complexity}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5" /> Model Inference
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-muted-foreground">Focus Prediction</p>
                  <p className="text-foreground font-medium">{latestPrediction.inference.focusDurationMinutes} mins</p>
                  <p className="text-muted-foreground">Status Classification</p>
                  <p className="text-foreground font-medium">
                    {latestPrediction.inference.statusClassification === 'completed' ? 'Completed' : 'In Progress'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5" /> AI Logic Engine
                </p>
                <p className="text-xs text-foreground">
                  Motivation Trigger: {latestPrediction.motivationTriggered ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{latestPrediction.motivationReason}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Email Notification:{' '}
                  {latestPrediction.motivationTriggered
                    ? emailStatus === 'sent'
                      ? 'Sent'
                      : emailStatus === 'failed'
                        ? 'Failed'
                        : 'Sending...'
                    : 'Not required'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
