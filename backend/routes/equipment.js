const express = require('express');
const { supabase, requireSupabase } = require('../supabase');
const router = express.Router();

router.get('/', requireSupabase, async (_req, res) => {
  const { data, error } = await supabase.from('equipment')
    .select('id,name,category,description,location,quantity,active')
    .eq('active', true).order('name');
  if (error) {
    console.error('Equipment query failed:', error.message);
    return res.status(500).json({ error: 'Could not load equipment.' });
  }
  return res.json({ equipment: data });
});
module.exports = router;
