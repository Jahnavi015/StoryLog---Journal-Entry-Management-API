module.exports = (req, res, next) => {
  const { title, body, moodTags } = req.body;

  if (!body || body.split(' ').length < 10) {
    return res.status(400).json({ status: false, message: 'Body must contain at least 10 words' });
  }
  if (!Array.isArray(moodTags) || moodTags.length === 0) {
    return res.status(400).json({ status: false, message: 'At least one mood tag is required' });
  }
  next();
};
