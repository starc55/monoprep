import assert from 'node:assert/strict';
import test from 'node:test';
import {
  requireAdmin,
  requireApprovedTeacher,
  requireExamManager,
  requireStudent,
  requireTeacher
} from './auth.middleware.js';

function runMiddleware(middleware, user) {
  let responseStatus = 200;
  let responseBody = null;
  let nextCalled = false;

  const req = { user };
  const res = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { responseStatus, responseBody, nextCalled };
}

test('student access stays separate from premium state', () => {
  const result = runMiddleware(requireStudent, {
    role: 'STUDENT',
    status: 'ACTIVE',
    premiumUntil: null
  });

  assert.equal(result.nextCalled, true);
});

test('student cannot access teacher or admin middleware', () => {
  const user = { role: 'STUDENT', status: 'ACTIVE' };

  assert.equal(runMiddleware(requireTeacher, user).responseStatus, 403);
  assert.equal(runMiddleware(requireAdmin, user).responseStatus, 403);
});

test('pending teacher cannot access the approved teacher dashboard', () => {
  const result = runMiddleware(requireApprovedTeacher, {
    role: 'TEACHER',
    status: 'ACTIVE',
    teacherProfile: { status: 'PENDING' }
  });

  assert.equal(result.responseStatus, 403);
  assert.equal(result.responseBody.code, 'TEACHER_APPROVAL_REQUIRED');
});

test('approved teacher must also have an active application account', () => {
  const result = runMiddleware(requireApprovedTeacher, {
    role: 'TEACHER',
    status: 'PENDING',
    teacherProfile: { status: 'APPROVED' }
  });

  assert.equal(result.responseStatus, 403);
  assert.equal(result.nextCalled, false);
});

test('active approved teacher can access teacher routes', () => {
  const result = runMiddleware(requireApprovedTeacher, {
    role: 'TEACHER',
    status: 'ACTIVE',
    teacherProfile: { status: 'APPROVED' }
  });

  assert.equal(result.nextCalled, true);
});

test('only active admins pass admin middleware', () => {
  assert.equal(
    runMiddleware(requireAdmin, { role: 'ADMIN', status: 'ACTIVE' }).nextCalled,
    true
  );
  assert.equal(
    runMiddleware(requireAdmin, { role: 'ADMIN', status: 'SUSPENDED' })
      .responseStatus,
    403
  );
});

test('exam management is available to active admins and approved teachers only', () => {
  assert.equal(
    runMiddleware(requireExamManager, {
      role: 'ADMIN',
      status: 'ACTIVE'
    }).nextCalled,
    true
  );
  assert.equal(
    runMiddleware(requireExamManager, {
      role: 'TEACHER',
      status: 'ACTIVE',
      teacherProfile: { status: 'APPROVED' }
    }).nextCalled,
    true
  );
  assert.equal(
    runMiddleware(requireExamManager, {
      role: 'TEACHER',
      status: 'ACTIVE',
      teacherProfile: { status: 'PENDING' }
    }).responseStatus,
    403
  );
  assert.equal(
    runMiddleware(requireExamManager, {
      role: 'STUDENT',
      status: 'ACTIVE'
    }).responseStatus,
    403
  );
});
