import { useAppStore } from '@/stores/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function MotivationPrompt() {
  const { currentMotivation, setCurrentMotivation } = useAppStore();

  if (!currentMotivation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative gradient-primary rounded-xl p-5 shadow-card overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary-foreground/5" />
        <div className="relative flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-foreground mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-primary-foreground leading-relaxed flex-1">
            {currentMotivation}
          </p>
          <button
            onClick={() => setCurrentMotivation(null)}
            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
