const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

// استيراد نموذج المستخدم
const User = require('../models/User');

// استيراد وسيط المصادقة
const auth = require('../middleware/auth');

// @route   POST api/users/register
// @desc    تسجيل مستخدم جديد
// @access  Public
router.post('/register', [
  check('username', 'اسم المستخدم مطلوب').not().isEmpty(),
  check('password', 'يرجى إدخال كلمة مرور بطول 6 أحرف على الأقل').isLength({ min: 6 })
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, telegramUsername, referralCode } = req.body;

  try {
    // التحقق من وجود المستخدم
    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ msg: 'المستخدم موجود بالفعل' });
    }

    // التحقق من رمز الإحالة إذا تم تقديمه
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ msg: 'رمز الإحالة غير صالح' });
      }
    }

    // إنشاء مستخدم جديد
    user = new User({
      username,
      email,
      password,
      telegramUsername,
      referredBy: referrer ? referrer._id : null
    });

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // حفظ المستخدم في قاعدة البيانات
    await user.save();

    // إضافة مكافأة للمستخدم المُحيل إذا وجد
    if (referrer) {
      // إضافة 15 عملة كمكافأة إحالة
      referrer.balance += 15;
      await referrer.save();
      
      // إنشاء معاملة للمكافأة
      const Transaction = require('../models/Transaction');
      await new Transaction({
        user: referrer._id,
        type: 'إحالة',
        amount: 15,
        description: `مكافأة إحالة المستخدم ${username}`,
        status: 'مكتمل'
      }).save();
    }

    // إنشاء رمز JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/users/login
// @desc    تسجيل دخول المستخدم
// @access  Public
router.post('/login', [
  check('username', 'يرجى إدخال اسم المستخدم').exists(),
  check('password', 'كلمة المرور مطلوبة').exists()
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // التحقق من وجود المستخدم
    let user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(400).json({ msg: 'بيانات الاعتماد غير صالحة' });
    }

    // التحقق من تطابق كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'بيانات الاعتماد غير صالحة' });
    }

    // إعادة تعيين التعدين اليومي إذا لزم الأمر
    user.resetDailyMining();
    
    // التحقق من انتهاء صلاحية الحزمة
    user.checkPackageExpiry();
    
    // حفظ التغييرات
    await user.save();

    // إنشاء رمز JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/users/me
// @desc    الحصول على بيانات المستخدم الحالي
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   PUT api/users/profile
// @desc    تحديث الملف الشخصي للمستخدم
// @access  Private
router.put('/profile', auth, async (req, res) => {
  const { username, email, telegramUsername, avatar } = req.body;
  
  // بناء كائن تحديث الملف الشخصي
  const profileFields = {};
  if (username) profileFields.username = username;
  if (email) profileFields.email = email;
  if (telegramUsername) profileFields.telegramUsername = telegramUsername;
  if (avatar) profileFields.avatar = avatar;
  
  try {
    // التحقق من وجود المستخدم
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من تفرد اسم المستخدم إذا تم تغييره
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ msg: 'اسم المستخدم مستخدم بالفعل' });
      }
    }
    
    // تحديث الملف الشخصي
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    );
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   POST api/users/telegram/link
// @desc    ربط حساب التليجرام
// @access  Private
router.post('/telegram/link', auth, async (req, res) => {
  const { telegramId, telegramUsername } = req.body;
  
  try {
    // التحقق من وجود المستخدم
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من عدم ارتباط معرف التليجرام بمستخدم آخر
    const existingUser = await User.findOne({ telegramId });
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({ msg: 'معرف التليجرام مرتبط بمستخدم آخر' });
    }
    
    // تحديث بيانات التليجرام
    user.telegramId = telegramId;
    user.telegramUsername = telegramUsername;
    await user.save();
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// @route   GET api/users/vip
// @desc    الحصول على معلومات مستوى VIP للمستخدم
// @access  Private
router.get('/vip', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // الحصول على مستوى VIP بناءً على رصيد المستخدم
    const VIPLevel = require('../models/VIPLevel');
    const vipLevel = await VIPLevel.getLevelByBalance(user.balance);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance
      },
      vipLevel
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
