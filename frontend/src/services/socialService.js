import api from './api.js';

export async function getStudents(params = {}) {
  const { data } = await api.get('/social/students', { params });
  return data.students;
}

export async function getStudentProfile(id) {
  const { data } = await api.get(`/social/students/${id}`);
  return data.student;
}

export async function followStudent(id) {
  const { data } = await api.post(`/social/follow/${id}`);
  return data.follow;
}

export async function unfollowStudent(id) {
  const { data } = await api.delete(`/social/follow/${id}`);
  return data;
}

export async function getFollowStatus(id) {
  const { data } = await api.get(`/social/follow-status/${id}`);
  return data.isFollowing;
}
