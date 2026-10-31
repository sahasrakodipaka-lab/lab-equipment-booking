const API_BASE = '/api';
const equipmentList = document.getElementById('equipment-list');
const equipmentSelect = document.getElementById('equipment-id');
const bookingForm = document.getElementById('booking-form');
const bookingMessage = document.getElementById('booking-message');
const lookupForm = document.getElementById('lookup-form');
const lookupResult = document.getElementById('lookup-result');
const adminPanel = document.getElementById('admin-panel');
const adminMessage = document.getElementById('admin-message');
let equipmentCache = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function showMessage(element, message, type = '') {
  element.textContent = message;
  element.className = `message ${type}`.trim();
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
}
function equipmentSymbol(category = '') {
  const text = category.toLowerCase();
  if (text.includes('computer') || text.includes('electronic')) return '⌘';
  if (text.includes('optical') || text.includes('microscope')) return '◉';
  if (text.includes('measure') || text.includes('sensor')) return '⌁';
  if (text.includes('chem')) return '⚗';
  return '⌬';
}
function renderEquipment(items) {
  equipmentCache = items;
  const query = document.getElementById('equipment-search').value.trim().toLowerCase();
  const filtered = items.filter((item) => `${item.name} ${item.category} ${item.description || ''} ${item.location || ''}`.toLowerCase().includes(query));
  equipmentList.innerHTML = '';
  if (!filtered.length) {
    equipmentList.innerHTML = '<div class="empty-state">No equipment matches your search.</div>';
  } else {
    filtered.forEach((item) => {
      const available = Number(item.quantity) > 0 && item.active !== false;
      const card = document.createElement('article');
      card.className = 'equipment-card';
      card.innerHTML = `<div class="equipment-top"><span class="equipment-icon" aria-hidden="true">${equipmentSymbol(item.category)}</span><span class="pill ${available ? '' : 'unavailable'}">${available ? 'Available to request' : 'Unavailable'}</span></div>
        <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || item.category || 'Laboratory equipment')}</p>
        <div class="equipment-meta"><span>${escapeHtml(item.location || 'Lab location not set')} · Qty ${Number(item.quantity)}</span><button class="text-button" type="button" ${available ? '' : 'disabled'} data-book="${escapeHtml(item.id)}">Book →</button></div>`;
      equipmentList.appendChild(card);
    });
  }
  equipmentSelect.innerHTML = '<option value="">Select equipment</option>';
  items.filter((item) => Number(item.quantity) > 0 && item.active !== false).forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} — ${item.location || item.category}`;
    equipmentSelect.appendChild(option);
  });
}
async function loadEquipment() {
  try {
    const data = await api('/equipment');
    renderEquipment(data.equipment || []);
  } catch (error) {
    equipmentList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}<br>Check that the backend is running and Supabase is configured.</div>`;
    equipmentSelect.innerHTML = '<option value="">Equipment unavailable</option>';
  }
}
equipmentList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-book]');
  if (!button) return;
  equipmentSelect.value = button.dataset.book;
  bookingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('student-name').focus({ preventScroll: true });
});
document.getElementById('equipment-search').addEventListener('input', () => renderEquipment(equipmentCache));

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(bookingMessage, '');
  const submitButton = document.getElementById('submit-booking');
  const formData = new FormData(bookingForm);
  const body = Object.fromEntries(formData.entries());
  if (new Date(body.endAt) <= new Date(body.startAt)) {
    showMessage(bookingMessage, 'End time must be later than start time.', 'error');
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';
  try {
    const result = await api('/bookings', { method: 'POST', body: JSON.stringify(body) });
    showMessage(bookingMessage, `Request submitted. Booking ID: ${result.booking.id}. Your private booking code is: ${result.booking.bookingCode}. Save both now; the private code is shown only once.`, 'success');
    document.getElementById('lookup-id').value = result.booking.id;
    document.getElementById('lookup-code').value = result.booking.bookingCode;
    bookingForm.reset();
  } catch (error) {
    showMessage(bookingMessage, error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit booking request <span>→</span>';
  }
});

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(lookupResult, 'Looking up your booking…');
  const id = document.getElementById('lookup-id').value.trim();
  const code = document.getElementById('lookup-code').value.trim();
  try {
    const result = await api(`/bookings/${encodeURIComponent(id)}`, { method: 'GET', headers: { 'X-Booking-Code': code } });
    const booking = result.booking;
    lookupResult.innerHTML = `<div class="lookup-result-card"><strong>${escapeHtml(booking.equipmentName)}</strong><p><b>Status:</b> ${escapeHtml(booking.status)}</p><p><b>Time:</b> ${escapeHtml(new Date(booking.startAt).toLocaleString())} – ${escapeHtml(new Date(booking.endAt).toLocaleString())}</p><p><b>Purpose:</b> ${escapeHtml(booking.purpose)}</p>${booking.status === 'pending' ? '<button type="button" class="button button-outline" id="cancel-own-booking">Cancel request</button>' : ''}</div>`;
    lookupResult.className = 'message success';
    const cancelButton = document.getElementById('cancel-own-booking');
    if (cancelButton) cancelButton.addEventListener('click', async () => {
      if (!confirm('Cancel this booking request?')) return;
      try {
        await api(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'X-Booking-Code': code } });
        showMessage(lookupResult, 'Your booking request has been cancelled.', 'success');
      } catch (error) { showMessage(lookupResult, error.message, 'error'); }
    });
  } catch (error) { showMessage(lookupResult, error.message, 'error'); }
});

document.getElementById('admin-open').addEventListener('click', () => {
  adminPanel.hidden = false;
  adminPanel.scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('admin-close').addEventListener('click', () => { adminPanel.hidden = true; });
function adminHeaders() {
  const key = sessionStorage.getItem('labbook-admin-key');
  if (!key) throw new Error('Enter the administrator key first.');
  return { 'X-Admin-Key': key };
}
document.getElementById('admin-login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = document.getElementById('admin-key').value;
  sessionStorage.setItem('labbook-admin-key', key);
  try {
    await loadAdminDashboard();
    showMessage(adminMessage, 'Administrator access verified for this browser tab.', 'success');
  } catch (error) {
    sessionStorage.removeItem('labbook-admin-key');
    showMessage(adminMessage, error.message, 'error');
  }
});
async function loadAdminDashboard() {
  const result = await api('/admin/bookings', { headers: adminHeaders() });
  document.getElementById('admin-dashboard').hidden = false;
  const container = document.getElementById('admin-bookings');
  if (!result.bookings.length) { container.innerHTML = '<div class="empty-state">No booking requests yet.</div>'; return; }
  container.innerHTML = `<table class="admin-table"><thead><tr><th>Equipment / ID</th><th>Student</th><th>Time</th><th>Purpose</th><th>Status</th><th>Update</th></tr></thead><tbody>${result.bookings.map((b) => `<tr><td><b>${escapeHtml(b.equipmentName)}</b><br><small>${escapeHtml(b.id)}</small></td><td>${escapeHtml(b.studentName)}<br>${escapeHtml(b.studentEmail)}</td><td>${escapeHtml(new Date(b.startAt).toLocaleString())}<br>to ${escapeHtml(new Date(b.endAt).toLocaleString())}</td><td>${escapeHtml(b.purpose)}</td><td>${escapeHtml(b.status)}</td><td><select aria-label="Update booking status" data-status-id="${escapeHtml(b.id)}"><option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${b.status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${b.status === 'rejected' ? 'selected' : ''}>Rejected</option><option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option><option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option></select></td></tr>`).join('')}</tbody></table>`;
  container.querySelectorAll('[data-status-id]').forEach((select) => select.addEventListener('change', async () => {
    try {
      await api(`/admin/bookings/${encodeURIComponent(select.dataset.statusId)}`, { method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ status: select.value }) });
      showMessage(adminMessage, 'Booking status updated.', 'success');
    } catch (error) { showMessage(adminMessage, error.message, 'error'); await loadAdminDashboard().catch(() => {}); }
  }));
}
document.getElementById('refresh-admin').addEventListener('click', async () => {
  try { await loadAdminDashboard(); showMessage(adminMessage, 'Booking list refreshed.', 'success'); }
  catch (error) { showMessage(adminMessage, error.message, 'error'); }
});
document.getElementById('add-equipment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = Object.fromEntries(new FormData(form).entries());
  body.quantity = Number(document.getElementById('new-quantity').value);
  try {
    await api('/admin/equipment', { method: 'POST', headers: adminHeaders(), body: JSON.stringify(body) });
    showMessage(document.getElementById('equipment-admin-message'), 'Equipment added successfully.', 'success');
    form.reset();
    await loadEquipment();
  } catch (error) { showMessage(document.getElementById('equipment-admin-message'), error.message, 'error'); }
});
const minDate = new Date(Date.now() + 5 * 60 * 1000);
const localDateTime = new Date(minDate.getTime() - minDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
document.getElementById('start-at').min = localDateTime;
document.getElementById('end-at').min = localDateTime;
document.getElementById('start-at').addEventListener('change', (event) => {
  document.getElementById('end-at').min = event.target.value;
});
loadEquipment();
