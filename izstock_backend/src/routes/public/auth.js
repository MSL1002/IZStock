// User authentication
const router = require('express').Router();

const asyncHandler = require('../../middleware/asyncHandler');
const requireSession = require('../../middleware/requireSession');
const authService = require('../../services/authService');

router.post('/register', asyncHandler(async (req, res) => {
    await authService.register(req.body);
    res.status(201).json({ message: 'Verification code sent.' });
}));

router.post('/login', asyncHandler(async (req, res) => {
    await authService.login(req.body.phone_number);
    res.status(200).json({ message: 'Verification code sent.' });
}));

router.post('/verify', (req, res) => {
  res.json(authService.verify(req.body));
});

router.post('/logout', requireSession, (req, res) => {
  authService.logout(req.tokenHash);
  res.status(204).json({ message: 'Logged out successfully.' });
});

module.exports = router;