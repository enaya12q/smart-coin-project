const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const userService = require('../services/userService');

// @route   POST api/users/register
// @desc    تسجيل مستخدم جديد
// @access  Public
router.post('/register', [
  check('username', 'يرجى إدخال اسم المستخدم').not().isEmpty(),
  check('password', 'يرجى إدخال كلمة مرور بطول 6 أحرف على الأقل').isLength({ min: 6 })
], async (req, res) => {
  // التحقق من صحة البيانات المدخلة
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, referralCode } = req.body;

  try {
    // التحقق من عدم وجود المستخدم مسبقًا
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ msg: 'المستخدم موجود بالفعل' });
    }

    // التحقق من رمز الإحالة إذا تم تقديمه
    let referredBy = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // إنشاء المستخدم الجديد
    const userData = {
      username,
      email,
      password,
      referredBy
    };

    const user = await userService.createUser(userData);

    // إنشاء رمز JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
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
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(400).json({ msg: 'بيانات الاعتماد غير صالحة' });
    }

    // التحقق من تطابق كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'بيانات الاعتماد غير صالحة' });
    }

    // إعادة تعيين التعدين اليومي إذا لزم الأمر
    await userService.resetDailyMining(user.id);
    
    // التحقق من انتهاء صلاحية الحزمة
    await userService.checkPackageExpiry(user.id);

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
    const user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // حذف كلمة المرور من البيانات المرسلة
    delete user.password;
    
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
  if (telegramUsername) profileFields.telegram_username = telegramUsername;
  if (avatar) profileFields.avatar = avatar;
  
  try {
    // التحقق من وجود المستخدم
    let user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من تفرد اسم المستخدم إذا تم تغييره
    if (username && username !== user.username) {
      const existingUser = await userService.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ msg: 'اسم المستخدم مستخدم بالفعل' });
      }
    }
    
    // تحديث الملف الشخصي
    user = await userService.updateUser(req.user.id, profileFields);
    
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
    let user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // التحقق من عدم ارتباط معرف التليجرام بمستخدم آخر
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();
      
    if (existingUser && existingUser.id !== user.id) {
      return res.status(400).json({ msg: 'معرف التليجرام مرتبط بمستخدم آخر' });
    }
    
    // تحديث بيانات التليجرام
    user = await userService.updateUser(req.user.id, {
      telegram_id: telegramId,
      telegram_username: telegramUsername
    });
    
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
    const user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }
    
    // الحصول على مستوى VIP بناءً على رصيد المستخدم
    const { data: vipLevel } = await supabase
      .from('vip_levels')
      .select('*')
      .lte('min_balance', user.balance)
      .order('min_balance', { ascending: false })
      .limit(1)
      .single();
    
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
