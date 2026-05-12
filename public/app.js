const API = '/api/students';

const state = {
  page: 1,
  limit: 10,
  q: '',
  course: '',
  total: 0,
  totalPages: 0,
  editingId: null,
  pendingDeleteId: null
};

const el = (id) => document.getElementById(id);

function showToast(message, type = 'info') {
  const container = el('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error((body && body.error && body.error.message) || 'Request failed');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function setView(view) {
  el('loading').classList.toggle('hidden', view !== 'loading');
  el('empty').classList.toggle('hidden', view !== 'empty');
  el('error').classList.toggle('hidden', view !== 'error');
  el('students-table').classList.toggle('hidden', view !== 'table');
  el('pagination').classList.toggle('hidden', view !== 'table');
}

async function loadStudents() {
  setView('loading');
  try {
    const params = new URLSearchParams({ page: state.page, limit: state.limit });
    if (state.q) params.set('q', state.q);
    if (state.course) params.set('course', state.course);
    const body = await apiFetch(`${API}?${params.toString()}`);
    state.total = body.pagination.total;
    state.totalPages = body.pagination.totalPages;
    renderStudents(body.data);
  } catch (err) {
    el('error').textContent = `Could not load students: ${err.message}`;
    setView('error');
  }
}

function renderStudents(students) {
  const tbody = el('students-tbody');
  tbody.innerHTML = '';

  if (!students.length) {
    setView('empty');
    el('page-info').textContent = '';
    return;
  }

  for (const s of students) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3">
        <div class="font-medium text-slate-900">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}</div>
        <div class="text-xs text-slate-500 sm:hidden">${escapeHtml(s.email)}</div>
      </td>
      <td class="px-4 py-3 hidden sm:table-cell text-slate-700">${escapeHtml(s.email)}</td>
      <td class="px-4 py-3 hidden md:table-cell text-slate-700">${escapeHtml(s.course || '—')}</td>
      <td class="px-4 py-3 hidden md:table-cell text-slate-700">${s.age != null ? escapeHtml(s.age) : '—'}</td>
      <td class="px-4 py-3 hidden lg:table-cell text-slate-500 text-sm">${escapeHtml(formatDate(s.dateRegistered))}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button data-edit="${s._id}" class="text-blue-600 hover:underline text-sm font-medium">Edit</button>
        <button data-delete="${s._id}" data-name="${escapeHtml(s.firstName)} ${escapeHtml(s.lastName)}"
                class="text-red-600 hover:underline text-sm font-medium ml-3">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  setView('table');
  const start = (state.page - 1) * state.limit + 1;
  const end = Math.min(state.page * state.limit, state.total);
  el('page-info').textContent = `Showing ${start}–${end} of ${state.total}`;
  el('prev-btn').disabled = state.page <= 1;
  el('next-btn').disabled = state.page >= state.totalPages;
}

async function loadStats() {
  try {
    const stats = await apiFetch(`${API}/stats`);
    el('stat-total').textContent = stats.total;
    el('stat-courses').textContent = stats.byCourse.length;
    el('stat-recent').textContent = stats.recentlyRegistered;
    populateCourseFilter(stats.byCourse);
  } catch (err) {
    el('stat-total').textContent = '—';
    el('stat-courses').textContent = '—';
    el('stat-recent').textContent = '—';
  }
}

function populateCourseFilter(byCourse) {
  const select = el('course-filter');
  const current = select.value;
  select.innerHTML = '<option value="">All courses</option>';
  for (const c of byCourse) {
    const opt = document.createElement('option');
    opt.value = c.course;
    opt.textContent = `${c.course} (${c.count})`;
    select.appendChild(opt);
  }
  if (current) select.value = current;
}

function openModal(student) {
  state.editingId = student ? student._id : null;
  el('modal-title').textContent = student ? 'Edit Student' : 'Add Student';
  el('student-id').value = student ? student._id : '';
  el('firstName').value = student ? student.firstName : '';
  el('lastName').value = student ? student.lastName : '';
  el('email').value = student ? student.email : '';
  el('age').value = student && student.age != null ? student.age : '';
  el('course').value = student ? student.course || '' : '';
  clearErrors();
  el('modal').classList.remove('hidden');
}

function closeModal() {
  el('modal').classList.add('hidden');
  state.editingId = null;
}

function clearErrors() {
  document.querySelectorAll('[data-error]').forEach((p) => {
    p.classList.add('hidden');
    p.textContent = '';
  });
  ['firstName', 'lastName', 'email', 'age', 'course'].forEach((id) => {
    el(id).classList.remove('input-error');
  });
}

function showFieldError(field, message) {
  const p = document.querySelector(`[data-error="${field}"]`);
  if (p) {
    p.textContent = message;
    p.classList.remove('hidden');
  }
  const input = el(field);
  if (input) input.classList.add('input-error');
}

function validateForm(payload) {
  clearErrors();
  let ok = true;
  if (!payload.firstName || payload.firstName.length < 2 || payload.firstName.length > 50) {
    showFieldError('firstName', 'First name must be 2-50 characters');
    ok = false;
  }
  if (!payload.lastName || payload.lastName.length < 2 || payload.lastName.length > 50) {
    showFieldError('lastName', 'Last name must be 2-50 characters');
    ok = false;
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    showFieldError('email', 'Enter a valid email');
    ok = false;
  }
  if (payload.age != null && payload.age !== '' && (payload.age < 0 || payload.age > 150)) {
    showFieldError('age', 'Age must be between 0 and 150');
    ok = false;
  }
  if (payload.course && payload.course.length > 100) {
    showFieldError('course', 'Course must be at most 100 characters');
    ok = false;
  }
  return ok;
}

async function submitForm(e) {
  e.preventDefault();
  const payload = {
    firstName: el('firstName').value.trim(),
    lastName: el('lastName').value.trim(),
    email: el('email').value.trim(),
    course: el('course').value.trim()
  };
  const ageVal = el('age').value;
  if (ageVal !== '') payload.age = Number(ageVal);
  if (!payload.course) delete payload.course;

  if (!validateForm({ ...payload, age: ageVal === '' ? null : Number(ageVal) })) return;

  el('submit-btn').disabled = true;
  try {
    if (state.editingId) {
      await apiFetch(`${API}/${state.editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Student updated', 'success');
    } else {
      await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Student created', 'success');
    }
    closeModal();
    await Promise.all([loadStudents(), loadStats()]);
  } catch (err) {
    if (err.status === 422 && err.body && err.body.errors) {
      err.body.errors.forEach((e) => showFieldError(e.field, e.message));
    } else if (err.status === 409) {
      showFieldError('email', 'Email already in use');
      showToast('Email already in use', 'error');
    } else {
      showToast(err.message || 'Save failed', 'error');
    }
  } finally {
    el('submit-btn').disabled = false;
  }
}

async function handleTableClick(e) {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');
  if (editBtn) {
    const id = editBtn.dataset.edit;
    try {
      const student = await apiFetch(`${API}/${id}`);
      openModal(student);
    } catch (err) {
      showToast('Could not load student', 'error');
    }
  } else if (delBtn) {
    state.pendingDeleteId = delBtn.dataset.delete;
    el('confirm-message').textContent = `Delete ${delBtn.dataset.name}? This cannot be undone.`;
    el('confirm').classList.remove('hidden');
  }
}

async function confirmDelete() {
  if (!state.pendingDeleteId) return;
  const id = state.pendingDeleteId;
  el('confirm').classList.add('hidden');
  try {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' });
    showToast('Student deleted', 'success');
    await Promise.all([loadStudents(), loadStats()]);
  } catch (err) {
    showToast(err.message || 'Delete failed', 'error');
  } finally {
    state.pendingDeleteId = null;
  }
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function wireEvents() {
  el('add-btn').addEventListener('click', () => openModal(null));
  el('modal-close').addEventListener('click', closeModal);
  el('cancel-btn').addEventListener('click', closeModal);
  el('student-form').addEventListener('submit', submitForm);
  el('students-tbody').addEventListener('click', handleTableClick);
  el('confirm-cancel').addEventListener('click', () => {
    el('confirm').classList.add('hidden');
    state.pendingDeleteId = null;
  });
  el('confirm-ok').addEventListener('click', confirmDelete);
  el('prev-btn').addEventListener('click', () => {
    if (state.page > 1) { state.page--; loadStudents(); }
  });
  el('next-btn').addEventListener('click', () => {
    if (state.page < state.totalPages) { state.page++; loadStudents(); }
  });
  el('search').addEventListener('input', debounce((e) => {
    state.q = e.target.value.trim();
    state.page = 1;
    loadStudents();
  }, 300));
  el('course-filter').addEventListener('change', (e) => {
    state.course = e.target.value;
    state.page = 1;
    loadStudents();
  });

  el('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  el('confirm').addEventListener('click', (e) => {
    if (e.target.id === 'confirm') {
      el('confirm').classList.add('hidden');
      state.pendingDeleteId = null;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      el('confirm').classList.add('hidden');
    }
  });
}

wireEvents();
loadStats();
loadStudents();
