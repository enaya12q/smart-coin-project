const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// تحميل متغيرات البيئة
dotenv.config();

// اتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// استيراد النماذج
const User = require('../backend/models/User');
const Transaction = require('../backend/models/Transaction');
const TONWallet = require('../backend/models/TONWallet');
const MiningPackage = require('../backend/models/MiningPackage');

// إنشاء بوت التليجرام
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// رابط الخادم الخلفي
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// إنشاء رمز تحقق عشوائي
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// تخزين رموز التحقق المؤقتة
const verificationCodes = new Map();

// تخزين جلسات المستخدمين
const userSessions = new Map();

// إنشاء رمز JWT
function generateToken(userId) {
  return jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// التحقق من وجود جلسة نشطة
function checkSession(chatId) {
  return userSessions.has(chatId.toString());
}

// إنشاء لوحة مفاتيح للقائمة الرئيسية
function getMainMenuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['💰 رصيدي', '⛏️ التعدين'],
        ['🛒 المتجر', '👥 الإحالة'],
        ['👤 الملف الشخصي', '📊 إحصائيات']
      ],
      resize_keyboard: true
    }
  };
}

// إنشاء لوحة مفاتيح للتعدين
function getMiningKeyboard(isMining) {
  return {
    reply_markup: {
      keyboard: [
        [isMining ? '⏹️ إيقاف التعدين' : '▶️ بدء التعدين'],
        ['💎 حزم التعدين', '📊 إحصائيات التعدين'],
        ['🔙 العودة للقائمة الرئيسية']
      ],
      resize_keyboard: true
    }
  };
}

// إنشاء لوحة مفاتيح للمتجر
function getStoreKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['💎 حزم التعدين', '🎮 بطاقات الألعاب'],
        ['🛍️ سلة المشتريات', '🔄 عمليات الشراء السابقة'],
        ['🔙 العودة للقائمة الرئيسية']
      ],
      resize_keyboard: true
    }
  };
}

// إنشاء لوحة مفاتيح للإحالة
function getReferralKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['🔗 رابط الإحالة', '👥 المستخدمين المُحالين'],
        ['💰 مكافآت الإحالة', '📊 إحصائيات الإحالة'],
        ['🔙 العودة للقائمة الرئيسية']
      ],
      resize_keyboard: true
    }
  };
}

// إنشاء لوحة مفاتيح للملف الشخصي
function getProfileKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ['📝 تعديل الملف الشخصي', '🔑 تغيير كلمة المرور'],
        ['💳 محفظة TON', '📊 إحصائيات الحساب'],
        ['🔙 العودة للقائمة الرئيسية']
      ],
      resize_keyboard: true
    }
  };
}

// معالجة أمر البداية
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  
  try {
    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await User.findOne({ telegramId: chatId.toString() });
    
    if (user) {
      // المستخدم موجود بالفعل
      userSessions.set(chatId.toString(), {
        userId: user._id,
        username: user.username,
        token: generateToken(user._id)
      });
      
      bot.sendMessage(
        chatId,
        `مرحباً بك مجدداً، ${user.username}! 👋\n\nأنت مسجل الدخول الآن. يمكنك استخدام القائمة أدناه للوصول إلى جميع الميزات.`,
        getMainMenuKeyboard()
      );
    } else {
      // المستخدم جديد
      const referralCode = msg.text.split(' ')[1]; // التحقق من وجود رمز إحالة
      
      bot.sendMessage(
        chatId,
        `مرحباً بك في بوت Smart Coin! 🪙\n\nللبدء، يرجى اختيار أحد الخيارات التالية:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔐 تسجيل الدخول', callback_data: 'login' }],
              [{ text: '📝 إنشاء حساب جديد', callback_data: `register:${referralCode || ''}` }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error('خطأ في معالجة أمر البداية:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.');
  }
});

// معالجة أزرار الاستجابة
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  try {
    if (data === 'login') {
      // تسجيل الدخول
      bot.sendMessage(chatId, 'يرجى إدخال اسم المستخدم الخاص بك:');
      userSessions.set(chatId.toString(), { state: 'waiting_username_for_login' });
    } else if (data.startsWith('register:')) {
      // إنشاء حساب جديد
      const referralCode = data.split(':')[1];
      bot.sendMessage(chatId, 'يرجى إدخال اسم مستخدم جديد:');
      userSessions.set(chatId.toString(), { 
        state: 'waiting_username_for_register',
        referralCode
      });
    } else if (data === 'verify_telegram') {
      // التحقق من حساب التليجرام
      const session = userSessions.get(chatId.toString());
      
      if (!session || !session.verificationCode) {
        bot.sendMessage(chatId, 'عذراً، انتهت صلاحية جلسة التحقق. يرجى بدء عملية تسجيل الدخول مرة أخرى.');
        return;
      }
      
      try {
        // تحديث بيانات المستخدم
        const user = await User.findById(session.userId);
        
        if (!user) {
          bot.sendMessage(chatId, 'عذراً، لم يتم العثور على المستخدم.');
          return;
        }
        
        user.telegramId = chatId.toString();
        user.telegramUsername = callbackQuery.from.username;
        await user.save();
        
        // تحديث الجلسة
        userSessions.set(chatId.toString(), {
          userId: user._id,
          username: user.username,
          token: generateToken(user._id)
        });
        
        bot.sendMessage(
          chatId,
          `تم ربط حساب التليجرام بنجاح! 🎉\n\nمرحباً بك، ${user.username}! يمكنك الآن استخدام جميع ميزات البوت.`,
          getMainMenuKeyboard()
        );
      } catch (error) {
        console.error('خطأ في ربط حساب التليجرام:', error);
        bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء ربط حساب التليجرام. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } else if (data.startsWith('buy_package:')) {
      // شراء حزمة تعدين
      const packageId = data.split(':')[1];
      const session = userSessions.get(chatId.toString());
      
      if (!session || !session.userId) {
        bot.sendMessage(chatId, 'يرجى تسجيل الدخول أولاً للقيام بعملية الشراء.');
        return;
      }
      
      try {
        // الحصول على معلومات الحزمة
        const miningPackage = await MiningPackage.findById(packageId);
        
        if (!miningPackage) {
          bot.sendMessage(chatId, 'عذراً، لم يتم العثور على الحزمة المطلوبة.');
          return;
        }
        
        // إرسال تأكيد الشراء
        bot.sendMessage(
          chatId,
          `هل أنت متأكد من رغبتك في شراء حزمة "${miningPackage.name}" بسعر ${miningPackage.price} TON؟`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ تأكيد الشراء', callback_data: `confirm_purchase:${packageId}` },
                  { text: '❌ إلغاء', callback_data: 'cancel_purchase' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.error('خطأ في معالجة طلب شراء الحزمة:', error);
        bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء معالجة طلب الشراء. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } else if (data.startsWith('confirm_purchase:')) {
      // تأكيد شراء حزمة
      const packageId = data.split(':')[1];
      const session = userSessions.get(chatId.toString());
      
      if (!session || !session.userId) {
        bot.sendMessage(chatId, 'يرجى تسجيل الدخول أولاً للقيام بعملية الشراء.');
        return;
      }
      
      try {
        // إجراء عملية الشراء عبر API
        const response = await axios.post(
          `${API_URL}/mining/purchase-package`,
          { packageId },
          { headers: { 'x-auth-token': session.token } }
        );
        
        bot.sendMessage(
          chatId,
          `تم شراء الحزمة بنجاح! 🎉\n\n${response.data.msg}`,
          getMainMenuKeyboard()
        );
      } catch (error) {
        console.error('خطأ في تأكيد شراء الحزمة:', error);
        bot.sendMessage(
          chatId,
          `عذراً، فشلت عملية الشراء: ${error.response?.data?.msg || 'حدث خطأ غير متوقع'}`
        );
      }
    } else if (data === 'cancel_purchase') {
      // إلغاء عملية الشراء
      bot.sendMessage(chatId, 'تم إلغاء عملية الشراء.', getMainMenuKeyboard());
    }
    
    // إزالة علامة التحميل من الزر
    bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('خطأ في معالجة استجابة الزر:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.');
    bot.answerCallbackQuery(callbackQuery.id);
  }
});

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
  if (msg.text.startsWith('/')) return; // تجاهل الأوامر
  
  const chatId = msg.chat.id;
  const text = msg.text;
  const session = userSessions.get(chatId.toString());
  
  if (!session) {
    // لا توجد جلسة نشطة
    bot.sendMessage(
      chatId,
      'مرحباً! يرجى استخدام الأمر /start للبدء.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 بدء استخدام البوت', callback_data: 'start_bot' }]
          ]
        }
      }
    );
    return;
  }
  
  try {
    // معالجة حالات الانتظار
    if (session.state === 'waiting_username_for_login') {
      // انتظار اسم المستخدم لتسجيل الدخول
      const username = text.trim();
      
      try {
        // البحث عن المستخدم
        const user = await User.findOne({ username });
        
        if (!user) {
          bot.sendMessage(chatId, 'عذراً، لم يتم العثور على المستخدم. يرجى التحقق من اسم المستخدم والمحاولة مرة أخرى.');
          return;
        }
        
        // طلب كلمة المرور
        bot.sendMessage(chatId, 'يرجى إدخال كلمة المرور الخاصة بك:');
        userSessions.set(chatId.toString(), {
          state: 'waiting_password_for_login',
          username
        });
      } catch (error) {
        console.error('خطأ في البحث عن المستخدم:', error);
        bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء البحث عن المستخدم. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } else if (session.state === 'waiting_password_for_login') {
      // انتظار كلمة المرور لتسجيل الدخول
      const password = text.trim();
      
      try {
        // محاولة تسجيل الدخول
        const response = await axios.post(`${API_URL}/users/login`, {
          username: session.username,
          password
        });
        
        const token = response.data.token;
        const userId = jwt.decode(token).user.id;
        
        // التحقق من ربط حساب التليجرام
        const user = await User.findById(userId);
        
        if (user.telegramId && user.telegramId !== chatId.toString()) {
          bot.sendMessage(chatId, 'عذراً، هذا الحساب مرتبط بحساب تليجرام آخر.');
          userSessions.delete(chatId.toString());
          return;
        }
        
        if (!user.telegramId) {
          // إنشاء رمز تحقق
          const verificationCode = generateVerificationCode();
          verificationCodes.set(userId, verificationCode);
          
          // تحديث الجلسة
          userSessions.set(chatId.toString(), {
            state: 'waiting_verification',
            userId,
            username: user.username,
            verificationCode
          });
          
          // إرسال رمز التحقق
          bot.sendMessage(
            chatId,
            `تم تسجيل الدخول بنجاح! 🎉\n\nلربط حساب التليجرام الخاص بك، يرجى إدخال رمز التحقق التالي في موقع الويب:\n\n${verificationCode}\n\nأو انقر على الزر أدناه للتحقق مباشرة:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ التحقق من حساب التليجرام', callback_data: 'verify_telegram' }]
                ]
              }
            }
          );
        } else {
          // تحديث الجلسة
          userSessions.set(chatId.toString(), {
            userId,
            username: user.username,
            token
          });
          
          bot.sendMessage(
            chatId,
            `تم تسجيل الدخول بنجاح! 👋\n\nمرحباً بك، ${user.username}! يمكنك الآن استخدام جميع ميزات البوت.`,
            getMainMenuKeyboard()
          );
        }
      } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        bot.sendMessage(chatId, 'عذراً، فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور والمحاولة مرة أخرى.');
      }
    } else if (session.state === 'waiting_username_for_register') {
      // انتظار اسم المستخدم للتسجيل
      const username = text.trim();
      
      // التحقق من صحة اسم المستخدم
      if (username.length < 3) {
        bot.sendMessage(chatId, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل. يرجى المحاولة مرة أخرى.');
        return;
      }
      
      try {
        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
          bot.sendMessage(chatId, 'عذراً، اسم المستخدم مستخدم بالفعل. يرجى اختيار اسم مستخدم آخر.');
          return;
        }
        
        // طلب كلمة المرور
        bot.sendMessage(chatId, 'يرجى إدخال كلمة مرور (6 أحرف على الأقل):');
        userSessions.set(chatId.toString(), {
          state: 'waiting_password_for_register',
          username,
          referralCode: session.referralCode
        });
      } catch (error) {
        console.error('خطأ في التحقق من اسم المستخدم:', error);
        bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء التحقق من اسم المستخدم. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } else if (session.state === 'waiting_password_for_register') {
      // انتظار كلمة المرور للتسجيل
      const password = text.trim();
      
      // التحقق من صحة كلمة المرور
      if (password.length < 6) {
        bot.sendMessage(chatId, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل. يرجى المحاولة مرة أخرى.');
        return;
      }
      
      try {
        // إنشاء حساب جديد
        const registerData = {
          username: session.username,
          password,
          telegramUsername: msg.from.username,
          telegramId: chatId.toString()
        };
        
        // إضافة رمز الإحالة إذا وجد
        if (session.referralCode) {
          registerData.referralCode = session.referralCode;
        }
        
        const response = await axios.post(`${API_URL}/users/register`, registerData);
        
        const token = response.data.token;
        const userId = jwt.decode(token).user.id;
        
        // تحديث الجلسة
        userSessions.set(chatId.toString(), {
          userId,
          username: session.username,
          token
        });
        
        bot.sendMessage(
          chatId,
          `تم إنشاء الحساب بنجاح! 🎉\n\nمرحباً بك، ${session.username}! يمكنك الآن استخدام جميع ميزات البوت.`,
          getMainMenuKeyboard()
        );
      } catch (error) {
        console.error('خطأ في إنشاء الحساب:', error);
        bot.sendMessage(chatId, `عذراً، فشل إنشاء الحساب: ${error.response?.data?.msg || 'حدث خطأ غير متوقع'}`);
      }
    } else {
      // معالجة أوامر القائمة
      switch (text) {
        case '💰 رصيدي':
          handleBalanceCommand(chatId, session);
          break;
        case '⛏️ التعدين':
          handleMiningCommand(chatId, session);
          break;
        case '🛒 المتجر':
          handleStoreCommand(chatId, session);
          break;
        case '👥 الإحالة':
          handleReferralCommand(chatId, session);
          break;
        case '👤 الملف الشخصي':
          handleProfileCommand(chatId, session);
          break;
        case '📊 إحصائيات':
          handleStatsCommand(chatId, session);
          break;
        case '▶️ بدء التعدين':
          handleStartMiningCommand(chatId, session);
          break;
        case '⏹️ إيقاف التعدين':
          handleStopMiningCommand(chatId, session);
          break;
        case '💎 حزم التعدين':
          handleMiningPackagesCommand(chatId, session);
          break;
        case '📊 إحصائيات التعدين':
          handleMiningStatsCommand(chatId, session);
          break;
        case '🔗 رابط الإحالة':
          handleReferralLinkCommand(chatId, session);
          break;
        case '👥 المستخدمين المُحالين':
          handleReferredUsersCommand(chatId, session);
          break;
        case '🔙 العودة للقائمة الرئيسية':
          bot.sendMessage(chatId, 'القائمة الرئيسية:', getMainMenuKeyboard());
          break;
        default:
          bot.sendMessage(chatId, 'عذراً، لم أفهم هذا الأمر. يرجى استخدام الأزرار أدناه للتنقل.', getMainMenuKeyboard());
      }
    }
  } catch (error) {
    console.error('خطأ في معالجة الرسالة:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.');
  }
});

// معالجة أمر الرصيد
async function handleBalanceCommand(chatId, session) {
  try {
    // الحصول على معلومات المستخدم
    const response = await axios.get(
      `${API_URL}/wallet/balance`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const { balance, withdrawalStatus } = response.data;
    
    // الحصول على معلومات محفظة TON
    let tonWalletInfo = null;
    try {
      const tonResponse = await axios.get(
        `${API_URL}/ton/wallet`,
        { headers: { 'x-auth-token': session.token } }
      );
      tonWalletInfo = tonResponse.data.wallet;
    } catch (error) {
      console.log('المستخدم ليس لديه محفظة TON');
    }
    
    // إنشاء رسالة الرصيد
    let message = `💰 *رصيدك الحالي*\n\n`;
    message += `Smart Coin: *${balance}* SC\n`;
    
    if (tonWalletInfo) {
      message += `TON: *${tonWalletInfo.balance}* TON\n`;
      message += `\nعنوان محفظة TON:\n\`${tonWalletInfo.address}\`\n`;
    }
    
    // إضافة معلومات قيود السحب
    if (withdrawalStatus && !withdrawalStatus.canWithdraw) {
      message += `\n⏳ *الوقت المتبقي حتى فتح السحب:*\n`;
      message += `${withdrawalStatus.daysLeft} يوم، ${withdrawalStatus.hoursLeft} ساعة، ${withdrawalStatus.minutesLeft} دقيقة\n`;
    }
    
    // إضافة أزرار إضافية
    const inlineKeyboard = [];
    
    if (!tonWalletInfo) {
      inlineKeyboard.push([{ text: '💳 إنشاء محفظة TON', web_app: { url: `${process.env.FRONTEND_URL}/ton-wallet` } }]);
    } else {
      inlineKeyboard.push([{ text: '💳 إدارة محفظة TON', web_app: { url: `${process.env.FRONTEND_URL}/ton-wallet` } }]);
    }
    
    inlineKeyboard.push([{ text: '📊 عرض المعاملات', web_app: { url: `${process.env.FRONTEND_URL}/wallet` } }]);
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الرصيد:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على معلومات الرصيد. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر التعدين
async function handleMiningCommand(chatId, session) {
  try {
    // الحصول على حالة التعدين
    const response = await axios.get(
      `${API_URL}/mining/status`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const { miningActive, todayMined, dailyMiningLimit, miningRate } = response.data;
    
    let message = `⛏️ *حالة التعدين*\n\n`;
    message += `الحالة: ${miningActive ? '✅ نشط' : '❌ متوقف'}\n`;
    message += `المعدن اليوم: ${todayMined} / ${dailyMiningLimit} SC\n`;
    message += `معدل التعدين: ${miningRate} SC/ساعة\n`;
    
    if (response.data.currentPackage) {
      message += `\n💎 *الحزمة الحالية*\n`;
      message += `الاسم: ${response.data.currentPackage.name}\n`;
      message += `تنتهي في: ${new Date(response.data.packageExpiry).toLocaleDateString()}\n`;
    }
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...getMiningKeyboard(miningActive)
    });
  } catch (error) {
    console.error('خطأ في الحصول على حالة التعدين:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على حالة التعدين. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر بدء التعدين
async function handleStartMiningCommand(chatId, session) {
  try {
    // بدء التعدين
    const response = await axios.post(
      `${API_URL}/mining/start`,
      {},
      { headers: { 'x-auth-token': session.token } }
    );
    
    bot.sendMessage(chatId, `✅ ${response.data.msg}`, getMiningKeyboard(true));
  } catch (error) {
    console.error('خطأ في بدء التعدين:', error);
    bot.sendMessage(
      chatId,
      `❌ ${error.response?.data?.msg || 'حدث خطأ أثناء بدء التعدين. يرجى المحاولة مرة أخرى لاحقاً.'}`,
      getMiningKeyboard(false)
    );
  }
}

// معالجة أمر إيقاف التعدين
async function handleStopMiningCommand(chatId, session) {
  try {
    // إيقاف التعدين
    const response = await axios.post(
      `${API_URL}/mining/stop`,
      {},
      { headers: { 'x-auth-token': session.token } }
    );
    
    bot.sendMessage(chatId, `✅ ${response.data.msg}`, getMiningKeyboard(false));
  } catch (error) {
    console.error('خطأ في إيقاف التعدين:', error);
    bot.sendMessage(
      chatId,
      `❌ ${error.response?.data?.msg || 'حدث خطأ أثناء إيقاف التعدين. يرجى المحاولة مرة أخرى لاحقاً.'}`,
      getMiningKeyboard(true)
    );
  }
}

// معالجة أمر حزم التعدين
async function handleMiningPackagesCommand(chatId, session) {
  try {
    // الحصول على حزم التعدين
    const response = await axios.get(
      `${API_URL}/mining/packages`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const packages = response.data;
    
    if (packages.length === 0) {
      bot.sendMessage(chatId, 'لا توجد حزم تعدين متاحة حالياً.');
      return;
    }
    
    let message = `💎 *حزم التعدين المتاحة*\n\n`;
    
    // إنشاء أزرار لكل حزمة
    const inlineKeyboard = [];
    
    packages.forEach(pkg => {
      message += `*${pkg.name}*\n`;
      message += `السعر: ${pkg.price} TON\n`;
      message += `معدل التعدين: ${pkg.miningRate} SC/ساعة\n`;
      message += `الحد اليومي: ${pkg.dailyLimit} SC\n`;
      message += `المدة: ${pkg.durationDays} يوم\n\n`;
      
      inlineKeyboard.push([{ text: `شراء ${pkg.name} (${pkg.price} TON)`, callback_data: `buy_package:${pkg._id}` }]);
    });
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على حزم التعدين:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على حزم التعدين. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر إحصائيات التعدين
async function handleMiningStatsCommand(chatId, session) {
  try {
    // الحصول على إحصائيات التعدين
    const response = await axios.get(
      `${API_URL}/mining/stats`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const stats = response.data;
    
    let message = `📊 *إحصائيات التعدين*\n\n`;
    message += `إجمالي المعدن: ${stats.totalMined} SC\n`;
    message += `المعدن هذا الأسبوع: ${stats.minedThisWeek} SC\n`;
    message += `المعدن هذا الشهر: ${stats.minedThisMonth} SC\n`;
    message += `أعلى معدل تعدين: ${stats.highestMiningRate} SC/ساعة\n`;
    message += `عدد الحزم المشتراة: ${stats.purchasedPackages}\n`;
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات التعدين:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على إحصائيات التعدين. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر المتجر
async function handleStoreCommand(chatId, session) {
  bot.sendMessage(chatId, '🛒 *المتجر*\n\nاختر من القائمة أدناه:', {
    parse_mode: 'Markdown',
    ...getStoreKeyboard()
  });
}

// معالجة أمر الإحالة
async function handleReferralCommand(chatId, session) {
  bot.sendMessage(chatId, '👥 *نظام الإحالة*\n\nاختر من القائمة أدناه:', {
    parse_mode: 'Markdown',
    ...getReferralKeyboard()
  });
}

// معالجة أمر رابط الإحالة
async function handleReferralLinkCommand(chatId, session) {
  try {
    // الحصول على رابط الإحالة
    const response = await axios.get(
      `${API_URL}/referral/link`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const { referralCode, referralLink, referralStats } = response.data;
    
    let message = `🔗 *رابط الإحالة الخاص بك*\n\n`;
    message += `الرمز: \`${referralCode}\`\n\n`;
    message += `الرابط: ${referralLink}\n\n`;
    message += `📊 *إحصائيات الإحالة*\n`;
    message += `عدد المستخدمين المُحالين: ${referralStats.totalReferrals}\n`;
    message += `إجمالي المكافآت: ${referralStats.totalRewards} SC\n`;
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 نسخ الرابط', callback_data: `copy_referral_link:${referralLink}` }],
          [{ text: '📱 مشاركة الرابط', switch_inline_query: `انضم إلى Smart Coin واحصل على مكافأة! ${referralLink}` }]
        ]
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على رابط الإحالة:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على رابط الإحالة. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر المستخدمين المُحالين
async function handleReferredUsersCommand(chatId, session) {
  try {
    // الحصول على المستخدمين المُحالين
    const response = await axios.get(
      `${API_URL}/referral/referred-users`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const referredUsers = response.data;
    
    if (referredUsers.length === 0) {
      bot.sendMessage(chatId, 'لم تقم بإحالة أي مستخدمين حتى الآن.');
      return;
    }
    
    let message = `👥 *المستخدمين المُحالين*\n\n`;
    
    referredUsers.forEach((user, index) => {
      message += `${index + 1}. *${user.username}*\n`;
      message += `تاريخ الانضمام: ${new Date(user.joinDate).toLocaleDateString()}\n`;
      message += `المكافأة: ${user.referralReward} SC\n\n`;
    });
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('خطأ في الحصول على المستخدمين المُحالين:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على المستخدمين المُحالين. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر الملف الشخصي
async function handleProfileCommand(chatId, session) {
  try {
    // الحصول على معلومات المستخدم
    const response = await axios.get(
      `${API_URL}/users/me`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const user = response.data;
    
    let message = `👤 *الملف الشخصي*\n\n`;
    message += `اسم المستخدم: ${user.username}\n`;
    message += `البريد الإلكتروني: ${user.email || 'غير محدد'}\n`;
    message += `تاريخ الانضمام: ${new Date(user.joinDate).toLocaleDateString()}\n`;
    message += `الرصيد: ${user.balance} SC\n`;
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...getProfileKeyboard()
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الملف الشخصي:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على معلومات الملف الشخصي. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// معالجة أمر الإحصائيات
async function handleStatsCommand(chatId, session) {
  try {
    // الحصول على إحصائيات المستخدم
    const response = await axios.get(
      `${API_URL}/users/stats`,
      { headers: { 'x-auth-token': session.token } }
    );
    
    const stats = response.data;
    
    let message = `📊 *إحصائيات الحساب*\n\n`;
    message += `الرصيد الحالي: ${stats.balance} SC\n`;
    message += `إجمالي المعدن: ${stats.totalMined} SC\n`;
    message += `عدد المستخدمين المُحالين: ${stats.referralsCount}\n`;
    message += `إجمالي مكافآت الإحالة: ${stats.referralRewards} SC\n`;
    message += `عدد المعاملات: ${stats.transactionsCount}\n`;
    message += `عدد عمليات الشراء: ${stats.purchasesCount}\n`;
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات الحساب:', error);
    bot.sendMessage(chatId, 'عذراً، حدث خطأ أثناء الحصول على إحصائيات الحساب. يرجى المحاولة مرة أخرى لاحقاً.');
  }
}

// بدء تشغيل البوت
console.log('تم بدء تشغيل بوت Smart Coin!');
