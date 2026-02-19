-- 프로젝트 모집 폼 (구글폼 스타일: 제목, 설명, 사진, 설문 문항)
CREATE TABLE public.project_recruitment_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_forms_project ON public.project_recruitment_forms(project_id);

-- 설문 문항 타입
DO $$ BEGIN
  CREATE TYPE public.recruitment_question_type AS ENUM (
    'short_text', 'long_text', 'paragraph_short', 'paragraph_long',
    'radio', 'checkbox', 'select', 'file_upload'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.project_recruitment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.project_recruitment_forms(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type public.recruitment_question_type NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_questions_form ON public.project_recruitment_questions(form_id);

CREATE TABLE public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_applications_project ON public.project_applications(project_id);

CREATE TABLE public.project_application_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.project_applications(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.project_recruitment_questions(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, question_id)
);

CREATE INDEX idx_application_answers_application ON public.project_application_answers(application_id);

ALTER TABLE public.project_recruitment_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_recruitment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_application_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recruitment_forms_select" ON public.project_recruitment_forms FOR SELECT USING (true);
CREATE POLICY "recruitment_forms_insert" ON public.project_recruitment_forms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = project_recruitment_forms.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);
CREATE POLICY "recruitment_forms_update" ON public.project_recruitment_forms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = project_recruitment_forms.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);
CREATE POLICY "recruitment_forms_delete" ON public.project_recruitment_forms FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = project_recruitment_forms.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);

CREATE POLICY "recruitment_questions_select" ON public.project_recruitment_questions FOR SELECT USING (true);
CREATE POLICY "recruitment_questions_insert" ON public.project_recruitment_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_recruitment_forms f JOIN public.projects p ON p.id = f.project_id JOIN public.members m ON m.club_id = p.club_id WHERE f.id = project_recruitment_questions.form_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);
CREATE POLICY "recruitment_questions_update" ON public.project_recruitment_questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_recruitment_forms f JOIN public.projects p ON p.id = f.project_id JOIN public.members m ON m.club_id = p.club_id WHERE f.id = project_recruitment_questions.form_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);
CREATE POLICY "recruitment_questions_delete" ON public.project_recruitment_questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.project_recruitment_forms f JOIN public.projects p ON p.id = f.project_id JOIN public.members m ON m.club_id = p.club_id WHERE f.id = project_recruitment_questions.form_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);

CREATE POLICY "project_applications_select" ON public.project_applications FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = project_applications.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);
CREATE POLICY "project_applications_insert" ON public.project_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_applications_update" ON public.project_applications FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = project_applications.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);

CREATE POLICY "project_application_answers_select" ON public.project_application_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_applications a WHERE a.id = project_application_answers.application_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.projects p JOIN public.members m ON m.club_id = p.club_id WHERE p.id = a.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved'))))
);
CREATE POLICY "project_application_answers_insert" ON public.project_application_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_applications a WHERE a.id = project_application_answers.application_id AND a.user_id = auth.uid())
);
CREATE POLICY "project_application_answers_update" ON public.project_application_answers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.project_applications a WHERE a.id = project_application_answers.application_id AND a.user_id = auth.uid())
);
