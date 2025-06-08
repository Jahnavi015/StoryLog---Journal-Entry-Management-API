module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    status: false,
    message: err.message || 'Internal Server Error',
    code: err.status || 500,
  });
};
