module.exports = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} by UserID: ${req.userId || 'Unknown'}`);
  }
  next();
};
