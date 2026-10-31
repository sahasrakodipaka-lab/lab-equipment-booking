function requireAdmin(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;
  const suppliedKey = req.get('X-Admin-Key');
  if (!configuredKey) return res.status(503).json({ error: 'Administrator access is not configured. Set ADMIN_API_KEY in backend/.env.' });
  if (!suppliedKey || suppliedKey.length !== configuredKey.length ||
      !require('crypto').timingSafeEqual(Buffer.from(suppliedKey), Buffer.from(configuredKey))) {
    return res.status(401).json({ error: 'Invalid administrator key.' });
  }
  next();
}
module.exports = { requireAdmin };
