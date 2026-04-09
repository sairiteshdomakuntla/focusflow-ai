import { create } from 'zustand';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  deadline: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  user_id: string;
}

export interface FocusSession {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  target_minutes: number;
  breaks_taken: number;
  completed: boolean;
  abandoned: boolean;
}

export interface MotivationSource {
  id: string;
  user_id: string;
  text: string;
}

export interface PredictionInput {
  taskName: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  category: string;
  complexity: number;
}

export interface PredictionResult {
  serialized: PredictionInput;
  encoded: {
    priority: number;
    difficulty: number;
    category: number;
  };
  standardized: {
    complexity: number;
  };
  inference: {
    focusDurationMinutes: number;
    statusClassification: 'completed' | 'in_progress';
  };
  motivationTriggered: boolean;
  motivationReason: string;
  createdAt: string;
}

export type ActiveView = 'dashboard' | 'tasks' | 'focus' | 'analytics' | 'prediction' | 'settings';

interface AppState {
  tasks: Task[];
  sessions: FocusSession[];
  motivationSources: MotivationSource[];
  latestPrediction: PredictionResult | null;
  currentMotivation: string | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  setTasks: (tasks: Task[]) => void;
  setSessions: (sessions: FocusSession[]) => void;
  setMotivationSources: (sources: MotivationSource[]) => void;
  setLatestPrediction: (prediction: PredictionResult) => void;
  setCurrentMotivation: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  sessions: [],
  motivationSources: [],
  latestPrediction: null,
  currentMotivation: null,
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  setTasks: (tasks) => set({ tasks }),
  setSessions: (sessions) => set({ sessions }),
  setMotivationSources: (sources) => set({ motivationSources: sources }),
  setLatestPrediction: (prediction) => set({ latestPrediction: prediction }),
  setCurrentMotivation: (msg) => set({ currentMotivation: msg }),
}));
