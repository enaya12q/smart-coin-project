const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const miningService = require('../services/miningService');

// @route   GET api/mining/status
// @desc    الحصول على حالة التعدين
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const miningStats = await miningService.getMiningStats(req.user.id);
    res.json(miningStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/mining/start
// @desc    بدء عملية التعدين
// @access  Private
router.post('/start', auth, async (req, res) => {
  try {
    const user = await miningService.startMining(req.user.id);
    res.json({
      success: true,
      message: 'تم بدء التعدين بنجاح',
      miningActive: user.mining_active,
      lastMiningTime: user.last_mining_time
    });
  } catch (err) {
    console.error(err.message);
    if (err.message) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/mining/stop
// @desc    إيقاف عملية التعدين وجمع المكافآت
// @access  Private
router.post('/stop', auth, async (req, res) => {
  try {
    const result = await miningService.stopMining(req.user.id);
    res.json({
      success: true,
      message: 'تم إيقاف التعدين وجمع المكافآت بنجاح',
      reward: result.reward,
      balance: result.user.balance,
      todayMined: result.user.today_mined,
      transaction: result.transaction
    });
  } catch (err) {
    console.error(err.message);
    if (err.message) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/mining/packages
// @desc    الحصول على حزم التعدين
// @access  Private
router.get('/packages', auth, async (req, res) => {
  try {
    const packages = await miningService.getMiningPackages();
    res.json(packages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/mining/purchase/:id
// @desc    شراء حزمة تعدين
// @access  Private
router.post('/purchase/:id', auth, async (req, res) => {
  try {
    const result = await miningService.purchaseMiningPackage(req.user.id, req.params.id);
    res.json({
      success: true,
      message: `تم شراء حزمة التعدين ${result.package.name} بنجاح`,
      package: result.package,
      balance: result.user.balance,
      transaction: result.transaction
    });
  } catch (err) {
    console.error(err.message);
    if (err.message) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
