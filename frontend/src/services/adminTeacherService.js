import api from './api.js';

export async function getAdminTeachers() {
  const { data } = await api.get('/admin/teachers');
  return data.teachers;
}

export async function createAdminTeacher(payload) {
  const { data } = await api.post('/admin/teachers', payload);
  return data.teacher;
}

export async function updateAdminTeacherStatus(id, status) {
  const { data } = await api.patch(`/admin/teachers/${id}/status`, { status });
  return data.teacher;
}
