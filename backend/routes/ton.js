const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const crypto = require('crypto');

// استيراد النماذج والخدمات
const User = require('../models/User');
const TONWallet = require('../models/TONWallet');
const Transaction = require('../models/Transaction');
const TONWalletService = require('../services/TONWalletService');

// استيراد وسيط المصادقة
const auth = require('../middleware/auth');

// @route   POST api/ton/create-wallet
// @desc    إنشاء محفظة TON جديدة للمستخدم
// @access  Private
router.post('/create-wallet', auth, async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من عدم وجود محفظة سابقة
    let wallet = await TONWallet.findOne({ user: req.user.id });
    
    if (wallet) {
      return res.status(400).json({ msg: 'المستخدم لديه محفظة بالفعل' });
    }
    
    // إنشاء محفظة TON جديدة
    const walletData = await TONWalletService.createWallet();
    
    // تشفير الكلمات الاسترجاعية (للعرض مرة واحدة فقط)
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encryptedSeedPhrase = cipher.update(walletData.mnemonic.join(' '), 'utf8', 'hex');
    encryptedSeedPhrase += cipher.final('hex');
    const ivString = iv.toString('hex');
    
    // إنشاء سجل المحفظة في قاعدة البيانات
    wallet = new TONWallet({
      user: req.user.id,
      address: walletData.address,
      publicKey: Buffer.from(walletData.keyPair.publicKey).toString('hex'),
      encryptedSeedPhrase: `${ivString}:${encryptedSeedPhrase}`
    });
    
    await wallet.save();
    
    // إنشاء رمز QR لعنوان المحفظة
    const qrCode = await QRCode.toDataURL(walletData.address);
    
    res.json({
      wallet: {
        address: walletData.address,
        publicKey: Buffer.from(walletData.keyPair.publicKey).toString('hex')
      },
      seedPhrase: walletData.mnemonic,
      qrCode,
      msg: 'تم إنشاء المحفظة بنجاح. احتفظ بالكلمات الاسترجاعية في مكان آمن، لن يتم عرضها مرة أخرى.'
    });
  } catch (err) {
    console.error('خطأ في إنشاء محفظة TON:', err);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/ton/wallet
// @desc    الحصول على معلومات محفظة المستخدم
// @access  Private
router.get('/wallet', auth, async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // البحث عن محفظة المستخدم
    const wallet = await TONWallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'المستخدم ليس لديه محفظة' });
    }
    
    // تحديث رصيد المحفظة
    await wallet.updateBalance(TONWalletService);
    
    // إنشاء رمز QR لعنوان المحفظة
    const qrCode = await QRCode.toDataURL(wallet.address);
    
    res.json({
      wallet: {
        address: wallet.address,
        balance: wallet.balance,
        lastBalanceUpdate: wallet.lastBalanceUpdate,
        externalWalletLinked: wallet.externalWalletLinked,
        externalWalletType: wallet.externalWalletType,
        externalWalletAddress: wallet.externalWalletAddress
      },
      qrCode
    });
  } catch (err) {
    console.error('خطأ في الحصول على معلومات المحفظة:', err);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/ton/link-external-wallet
// @desc    ربط محفظة TON خارجية
// @access  Private
router.post('/link-external-wallet', [
  auth,
  [
    check('address', 'عنوان المحفظة مطلوب').not().isEmpty(),
    check('walletType', 'نوع المحفظة مطلوب').isIn(['tonkeeper', 'tonhub', 'other'])
  ]
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { address, walletType } = req.body;
  
  try {
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // البحث عن محفظة المستخدم
    let wallet = await TONWallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'المستخدم ليس لديه محفظة' });
    }
    
    // التحقق من صحة عنوان المحفظة
    if (!TONWalletService.isValidTONAddress(address)) {
      return res.status(400).json({ msg: 'عنوان المحفظة غير صالح' });
    }
    
    // ربط المحفظة الخارجية
    await wallet.linkExternalWallet(address, walletType);
    
    res.json({
      msg: 'تم ربط المحفظة الخارجية بنجاح',
      wallet: {
        address: wallet.address,
        externalWalletLinked: wallet.externalWalletLinked,
        externalWalletType: wallet.externalWalletType,
        externalWalletAddress: wallet.externalWalletAddress
      }
    });
  } catch (err) {
    console.error('خطأ في ربط المحفظة الخارجية:', err);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/ton/unlink-external-wallet
// @desc    إلغاء ربط المحفظة الخارجية
// @access  Private
router.post('/unlink-external-wallet', auth, async (req, res) => {
  try {
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // البحث عن محفظة المستخدم
    let wallet = await TONWallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'المستخدم ليس لديه محفظة' });
    }
    
    // التحقق من وجود محفظة خارجية مرتبطة
    if (!wallet.externalWalletLinked) {
      return res.status(400).json({ msg: 'لا توجد محفظة خارجية مرتبطة' });
    }
    
    // إلغاء ربط المحفظة الخارجية
    await wallet.unlinkExternalWallet();
    
    res.json({
      msg: 'تم إلغاء ربط المحفظة الخارجية بنجاح',
      wallet: {
        address: wallet.address,
        externalWalletLinked: wallet.externalWalletLinked
      }
    });
  } catch (err) {
    console.error('خطأ في إلغاء ربط المحفظة الخارجية:', err);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/ton/create-payment-link
// @desc    إنشاء رابط دفع TON
// @access  Private
router.post('/create-payment-link', [
  auth,
  [
    check('amount', 'المبلغ مطلوب').isNumeric(),
    check('comment', 'التعليق يجب أن يكون نصًا').optional().isString()
  ]
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { amount, comment } = req.body;
  
  try {
    // التحقق من وجود المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // البحث عن محفظة المستخدم
    const wallet = await TONWallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'المستخدم ليس لديه محفظة' });
    }
    
    // إنشاء رابط الدفع
    const paymentLink = wallet.createPaymentLink(amount, comment, TONWalletService);
    
    // إنشاء رمز QR لرابط الدفع
    const qrCode = await QRCode.toDataURL(paymentLink);
    
    res.json({
      paymentLink,
      qrCode,
      amount,
      comment
    });
  } catch (err) {
    console.error('خطأ في إنشاء رابط دفع:', err);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
