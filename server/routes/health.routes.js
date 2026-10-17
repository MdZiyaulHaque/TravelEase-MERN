const router = require('express').Router();
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'TravelEase API is running', timestamp: new Date().toISOString() });
});
module.exports = router;
