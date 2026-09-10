import api from './api.js';

export async function getExams() {
  const { data } = await api.get('/exams');
  return data.exams;
}

export async function getExam(id) {
  const { data } = await api.get(`/exams/${id}`);
  return data.exam;
}

export async function createExam(payload) {
  const { data } = await api.post('/exams', payload);
  return data.exam;
}

export async function updateExam(id, payload) {
  const { data } = await api.put(`/exams/${id}`, payload);
  return data.exam;
}

export async function deleteExam(id) {
  const { data } = await api.delete(`/exams/${id}`);
  return data;
}

export async function createSection(payload) {
  const { data } = await api.post('/sections', payload);
  return data.section;
}

export async function updateSection(id, payload) {
  const { data } = await api.put(`/sections/${id}`, payload);
  return data.section;
}

export async function deleteSection(id) {
  const { data } = await api.delete(`/sections/${id}`);
  return data;
}

export async function createPassage(payload) {
  const { data } = await api.post('/passages', payload);
  return data.passage;
}

export async function getPassages() {
  const { data } = await api.get('/passages');
  return data.passages;
}

export async function updatePassage(id, payload) {
  const { data } = await api.put(`/passages/${id}`, payload);
  return data.passage;
}

export async function deletePassage(id) {
  const { data } = await api.delete(`/passages/${id}`);
  return data;
}

export async function createQuestion(payload) {
  const { data } = await api.post('/questions', payload);
  return data.question;
}

export async function uploadQuestionImage(file) {
  const body = new FormData();
  body.append('image', file);
  const { data } = await api.post('/uploads/images', body);
  return data.url;
}

export async function uploadPassageFile(file) {
  const body = new FormData();
  body.append('file', file);
  const { data } = await api.post('/uploads/passage-files', body);
  return data;
}

export async function previewPdfQuestionImport(file) {
  const body = new FormData();
  body.append('file', file);
  const { data } = await api.post('/ai/pdf-import/preview', body, {
    timeout: 600000
  });
  return data;
}

export async function commitPdfQuestionImport(payload) {
  const { data } = await api.post('/ai/pdf-import/commit', payload, {
    timeout: 210000
  });
  return data;
}

export async function uploadTeacherImage(file) {
  const body = new FormData();
  body.append('image', file);
  const { data } = await api.post('/uploads/teacher-images', body);
  return data.url;
}

export async function getQuestions() {
  const { data } = await api.get('/questions');
  return data.questions;
}

export async function updateQuestion(id, payload) {
  const { data } = await api.put(`/questions/${id}`, payload);
  return data.question;
}

export async function deleteQuestion(id) {
  const { data } = await api.delete(`/questions/${id}`);
  return data;
}

export async function createOption(payload) {
  const { data } = await api.post('/options', payload);
  return data.option;
}

export async function deleteOption(id) {
  const { data } = await api.delete(`/options/${id}`);
  return data;
}
