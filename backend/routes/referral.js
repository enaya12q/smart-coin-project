const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const referralService = require('../services/referralService');

// @route   GET api/referral/link
// @desc    الحصول على رابط الإحالة
// @access  Private
router.get('/link', auth, async (req, res) => {
  try {
    const referralInfo = await referralService.getReferralLink(req.user.id);
    res.json(referralInfo);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/referral/stats
// @desc    الحصول على إحصائيات الإحالة
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const referralStats = await referralService.getReferralStats(req.user.id);
    res.json(referralStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/referral/referred-users
// @desc    الحصول على المستخدمين المُحالين
// @access  Private
router.get('/referred-users', auth, async (req, res) => {
  try {
    const referredUsers = await referralService.getReferredUsers(req.user.id);
    res.json(referredUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
