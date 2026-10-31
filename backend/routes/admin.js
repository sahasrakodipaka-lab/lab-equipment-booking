const express = require('express');
const { supabase, requireSupabase } = require('../supabase');
const { requireAdmin } = require('../middleware/admin');
const { cleanString } = require('../utils/validation');
const router = express.Router();
router.use(requireSupabase, requireAdmin);

router.get('/bookings', async (_req, res) => {
  const { data, error } = await supabase.from('bookings')
    .select('id,student_name,student_email,start_at,end_at,purpose,status,created_at,equipment(name)')
    .order('created_at', { ascending: false }).limit(300);
  if (error) {
    console.error('Admin booking list failed:', error.message);
    return res.status(500).json({ error: 'Could not load booking requests.' });
  }
  const bookings = data.map((row) => ({
    id: row.id, studentName: row.student_name, studentEmail: row.student_email,
    startAt: row.start_at, endAt: row.end_at, purpose: row.purpose,
    status: row.status, createdAt: row.created_at,
    equipmentName: row.equipment ? row.equipment.name : 'Equipment'
  }));
  return res.json({ bookings });
});
router.patch('/bookings/:id', async (req, res) => {
  const allowed = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
  const status = cleanString(req.body.status, 20);
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid booking status.' });
  const { data, error } = await supabase.from('bookings').update({ status })
    .eq('id', req.params.id).select('id,status').maybeSingle();
  if (error) {
    console.error('Admin status update failed:', error.message);
    return res.status(500).json({ error: 'Could not update booking status.' });
  }
  if (!data) return res.status(404).json({ error: 'Booking not found.' });
  return res.json({ booking: data });
});
router.post('/equipment', async (req, res) => {
  const name = cleanString(req.body.name, 120);
  const category = cleanString(req.body.category, 80);
  const location = cleanString(req.body.location, 120);
  const description = cleanString(req.body.description || '', 500);
  const quantity = Number(req.body.quantity);
  if (!name || !category || !location || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    return res.status(400).json({ error: 'Provide a name, category, location, and quantity from 1 to 1000.' });
  }
  const { data, error } = await supabase.from('equipment').insert({
    name, category, location, description, quantity, active: true
  }).select('id,name,category,location,quantity').single();
  if (error) {
    console.error('Equipment creation failed:', error.message);
    return res.status(500).json({ error: 'Could not add equipment.' });
  }
  return res.status(201).json({ equipment: data });
});
module.exports = router;
