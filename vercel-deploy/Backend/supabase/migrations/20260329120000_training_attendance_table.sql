-- سجل حضور التدريب للموظفين (ورقة TrainingAttendance / إجراء getAllTrainingAttendance)
-- نفس نمط الجداول المرنة: id + data jsonb
CREATE TABLE IF NOT EXISTS public.training_attendance (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_updated ON public.training_attendance (updated_at);
