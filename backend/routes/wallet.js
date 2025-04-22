const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// استيراد نموذج المستخدم والمعاملات
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// استيراد وسيط المصادقة
const auth = require('../middleware/auth');

// @route   GET api/wallet/balance
// @desc    الحصول على رصيد المستخدم
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من أهلية السحب وتحديث حالة المستخدم
    user.checkWithdrawalEligibility();
    await user.save();
    
    // حساب الوقت المتبقي حتى فتح السحب
    const withdrawalStatus = user.getTimeUntilWithdrawal();
    
    res.json({
      balance: user.balance,
      canWithdraw: user.canWithdraw,
      withdrawalStatus
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/wallet/transactions
// @desc    الحصول على معاملات المستخدم
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    
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
    // التحقق من وجود المستخدم المرسل
    const sender = await User.findById(req.user.id);
    
    if (!sender) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من وجود المستخدم المستلم
    const recipientUser = await User.findOne({ username: recipient });
    
    if (!recipientUser) {
      return res.status(404).json({ msg: 'المستخدم المستلم غير موجود' });
    }
    
    // التحقق من أن المستخدم لا يحاول التحويل لنفسه
    if (sender.id === recipientUser.id) {
      return res.status(400).json({ msg: 'لا يمكن التحويل لنفسك' });
    }
    
    // التحقق من كفاية الرصيد
    if (sender.balance < amount) {
      return res.status(400).json({ msg: 'رصيد غير كافٍ' });
    }
    
    // تحديث الأرصدة
    sender.balance -= parseFloat(amount);
    recipientUser.balance += parseFloat(amount);
    
    // إنشاء معاملة للمرسل
    const senderTransaction = new Transaction({
      user: sender.id,
      type: 'تحويل',
      amount: -parseFloat(amount),
      description: description || `تحويل إلى ${recipientUser.username}`,
      status: 'مكتمل',
      toUser: recipientUser.id
    });
    
    // إنشاء معاملة للمستلم
    const recipientTransaction = new Transaction({
      user: recipientUser.id,
      type: 'استلام',
      amount: parseFloat(amount),
      description: description || `استلام من ${sender.username}`,
      status: 'مكتمل',
      fromUser: sender.id
    });
    
    // حفظ التغييرات
    await sender.save();
    await recipientUser.save();
    await senderTransaction.save();
    await recipientTransaction.save();
    
    res.json({
      msg: 'تم التحويل بنجاح',
      transaction: senderTransaction
    });
  } catch (err) {
    console.error(err.message);
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
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من أهلية السحب
    user.checkWithdrawalEligibility();
    
    if (!user.canWithdraw) {
      // حساب الوقت المتبقي حتى فتح السحب
      const withdrawalStatus = user.getTimeUntilWithdrawal();
      
      return res.status(403).json({
        msg: 'لا يمكن السحب قبل مرور 40 يوم من تاريخ التسجيل',
        withdrawalStatus
      });
    }
    
    // التحقق من كفاية الرصيد
    if (user.balance < amount) {
      return res.status(400).json({ msg: 'رصيد غير كافٍ' });
    }
    
    // الحد الأدنى للسحب
    if (amount < 10) {
      return res.status(400).json({ msg: 'الحد الأدنى للسحب هو 10 عملات' });
    }
    
    // إنشاء معاملة سحب معلقة
    const withdrawalTransaction = new Transaction({
      user: user.id,
      type: 'سحب',
      amount: -parseFloat(amount),
      description: `طلب سحب إلى المحفظة ${walletAddress}`,
      status: 'معلق'
    });
    
    // حفظ المعاملة
    await withdrawalTransaction.save();
    
    res.json({
      msg: 'تم إرسال طلب السحب بنجاح وسيتم مراجعته',
      transaction: withdrawalTransaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/wallet/withdrawal-status
// @desc    الحصول على حالة السحب
// @access  Private
router.get('/withdrawal-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من أهلية السحب وتحديث حالة المستخدم
    user.checkWithdrawalEligibility();
    await user.save();
    
    // حساب الوقت المتبقي حتى فتح السحب
    const withdrawalStatus = user.getTimeUntilWithdrawal();
    
    res.json({
      canWithdraw: user.canWithdraw,
      withdrawalStatus,
      joinDate: user.joinDate,
      withdrawalUnlockDate: user.withdrawalUnlockDate
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
