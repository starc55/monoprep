do $$
begin
  create type "ExamSource" as enum ('MONOPREP', 'OFFICIAL');
exception
  when duplicate_object then null;
end
$$;

alter table public.exams
  add column if not exists exam_source "ExamSource" not null default 'MONOPREP';

create index if not exists exams_exam_source_is_published_created_at_idx
  on public.exams (exam_source, is_published, created_at);
