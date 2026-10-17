function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Zugriff verweigert: Administratorrechte erforderlich.' });
  }
  next();
}
module.exports = requireAdmin;