const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const walletService = require('../services/walletService');
const userService = require('../services/userService');

// @route   GET api/wallet/balance
// @desc    الحصول على رصيد المحفظة
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    res.json({
      balance: user.balance
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/wallet/transactions
// @desc    الحصول على معاملات المحفظة
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await walletService.getWalletTransactions(req.user.id, limit, offset);
    
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/wallet/transfer
// @desc    تحويل عملات إلى مستخدم آخر
// @access  Private
router.post('/transfer', [
  auth,
  [
    check('recipient', 'اسم المستخدم المستلم مطلوب').not().isEmpty(),
    check('amount', 'المبلغ مطلوب').isNumeric()
  ]
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { recipient, amount, description } = req.body;
  
  try {
    const result = await walletService.transferCoins(
      req.user.id,
      recipient,
      parseFloat(amount),
      description
    );
    
    res.json({
      msg: 'تم التحويل بنجاح',
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

// @route   POST api/wallet/withdraw
// @desc    طلب سحب العملات
// @access  Private
router.post('/withdraw', [
  auth,
  [
    check('amount', 'المبلغ مطلوب').isNumeric(),
    check('walletAddress', 'عنوان المحفظة مطلوب').not().isEmpty()
  ]
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { amount, walletAddress } = req.body;
  
  try {
    const result = await walletService.requestWithdrawal(
      req.user.id,
      parseFloat(amount),
      walletAddress
    );
    
    res.json({
      msg: 'تم إرسال طلب السحب بنجاح وسيتم مراجعته',
      transaction: result.transaction
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'WITHDRAWAL_NOT_ELIGIBLE') {
      return res.status(403).json({
        msg: err.message,
        withdrawalStatus: err.withdrawalStatus
      });
    } else if (err.message) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/wallet/withdrawal-status
// @desc    الحصول على حالة السحب
// @access  Private
router.get('/withdrawal-status', auth, async (req, res) => {
  try {
    // التحقق من أهلية السحب وتحديث حالة المستخدم
    const canWithdraw = await userService.checkWithdrawalEligibility(req.user.id);
    
    // حساب الوقت المتبقي حتى فتح السحب
    const withdrawalStatus = await userService.getTimeUntilWithdrawal(req.user.id);
    
    // الحصول على بيانات المستخدم
    const user = await userService.getUserById(req.user.id);
    
    res.json({
      canWithdraw,
      withdrawalStatus,
      joinDate: user.join_date,
      withdrawalUnlockDate: user.withdrawal_unlock_date
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
