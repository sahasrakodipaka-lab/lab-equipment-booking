const express = require('express');
const crypto = require('crypto');
const { supabase, requireSupabase } = require('../supabase');
const { cleanString, isEmail, validDateRange } = require('../utils/validation');
const router = express.Router();

function makeBookingCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}
function bookingView(row) {
  return {
    id: row.id,
    equipmentName: row.equipment ? row.equipment.name : 'Equipment',
    studentName: row.student_name,
    studentEmail: row.student_email,
    startAt: row.start_at,
    endAt: row.end_at,
    purpose: row.purpose,
    status: row.status,
    createdAt: row.created_at
  };
}
router.post('/', requireSupabase, async (req, res) => {
  const equipmentId = cleanString(req.body.equipmentId, 80);
  const studentName = cleanString(req.body.studentName, 100);
  const studentEmail = cleanString(req.body.studentEmail, 254).toLowerCase();
  const purpose = cleanString(req.body.purpose, 500);
  const startAt = req.body.startAt;
  const endAt = req.body.endAt;
  if (!equipmentId || !studentName || !isEmail(studentEmail) || !purpose || !validDateRange(startAt, endAt)) {
    return res.status(400).json({ error: 'Enter valid details. The end must be after the start, the booking must be in the future, and sessions can be up to 12 hours.' });
  }
  const { data: equipment, error: equipmentError } = await supabase.from('equipment')
    .select('id,name,quantity,active').eq('id', equipmentId).maybeSingle();
  if (equipmentError) {
    console.error('Equipment lookup failed:', equipmentError.message);
    return res.status(500).json({ error: 'Could not verify the selected equipment.' });
  }
  if (!equipment || !equipment.active || equipment.quantity < 1) {
    return res.status(400).json({ error: 'This equipment is not currently available for requests.' });
  }
  const { data: overlapping, error: overlapError } = await supabase.from('bookings')
    .select('id').eq('equipment_id', equipmentId)
    .in('status', ['pending', 'approved'])
    .lt('start_at', new Date(endAt).toISOString())
    .gt('end_at', new Date(startAt).toISOString());
  if (overlapError) {
    console.error('Availability check failed:', overlapError.message);
    return res.status(500).json({ error: 'Could not check equipment availability.' });
  }
  if (overlapping && overlapping.length >= Number(equipment.quantity)) {
    return res.status(409).json({ error: 'That equipment is already booked for the selected time. Choose another time.' });
  }
  const bookingCode = makeBookingCode();
  const { data, error } = await supabase.from('bookings').insert({
    equipment_id: equipmentId, student_name: studentName, student_email: studentEmail,
    start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(),
    purpose, status: 'pending', booking_code_hash: crypto.createHash('sha256').update(bookingCode).digest('hex')
  }).select('id,start_at,end_at,status').single();
  if (error) {
    console.error('Booking insert failed:', error.message);
    return res.status(500).json({ error: 'Could not save the booking. Please try again.' });
  }
  return res.status(201).json({ booking: { id: data.id, startAt: data.start_at, endAt: data.end_at, status: data.status, bookingCode } });
});
router.get('/:id', requireSupabase, async (req, res) => {
  const code = cleanString(req.get('X-Booking-Code'), 40);
  if (!code) return res.status(401).json({ error: 'Provide the private booking code to view this request.' });
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const { data, error } = await supabase.from('bookings')
    .select('id,student_name,student_email,start_at,end_at,purpose,status,created_at,booking_code_hash,equipment(name)')
    .eq('id', req.params.id).eq('booking_code_hash', hash).maybeSingle();
  if (error) {
    console.error('Booking lookup failed:', error.message);
    return res.status(500).json({ error: 'Could not look up this booking.' });
  }
  if (!data) return res.status(404).json({ error: 'Booking not found. Check the ID and private code.' });
  return res.json({ booking: bookingView(data) });
});
router.post('/:id/cancel', requireSupabase, async (req, res) => {
  const code = cleanString(req.get('X-Booking-Code'), 40);
  if (!code) return res.status(401).json({ error: 'Provide the private booking code to cancel this request.' });
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const { data, error } = await supabase.from('bookings').update({ status: 'cancelled' })
    .eq('id', req.params.id).eq('booking_code_hash', hash).eq('status', 'pending')
    .select('id').maybeSingle();
  if (error) {
    console.error('Booking cancellation failed:', error.message);
    return res.status(500).json({ error: 'Could not cancel this booking.' });
  }
  if (!data) return res.status(404).json({ error: 'Booking not found, code is incorrect, or the request is no longer pending.' });
  return res.json({ message: 'Booking request cancelled.' });
});
module.exports = router;
