// ملف التكوين لدمج المكونات
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// ميدلوير
app.use(express.json());
app.use(cors());

// اتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// تعريف المسارات
app.use('/api/users', require('./routes/users'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/mining', require('./routes/mining'));
app.use('/api/store', require('./routes/store'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/ton', require('./routes/ton'));

// خدمة الملفات الثابتة في بيئة الإنتاج
if (process.env.NODE_ENV === 'production') {
  // تعيين المجلد الثابت
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // أي مسار غير معرف يذهب إلى index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// تعريف المنفذ
const PORT = process.env.PORT || 5000;

// بدء الخادم
const server = app.listen(PORT, () => console.log(`تم بدء الخادم على المنفذ ${PORT}`));

// إعداد Socket.io للتحديثات في الوقت الحقيقي
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000']
  }
});

// معالجة اتصالات Socket.io
io.on('connection', socket => {
  console.log('تم اتصال مستخدم جديد بـ Socket.io');
  
  // الانضمام إلى غرفة خاصة بالمستخدم
  socket.on('join', ({ userId }) => {
    socket.join(userId);
    console.log(`المستخدم ${userId} انضم إلى غرفته الخاصة`);
  });
  
  // معالجة قطع الاتصال
  socket.on('disconnect', () => {
    console.log('تم قطع اتصال مستخدم');
  });
});

// تصدير الـ Socket.io للاستخدام في الوحدات الأخرى
module.exports = { io };

// بدء بوت التليجرام
if (process.env.ENABLE_TELEGRAM_BOT === 'true') {
  try {
    require('../telegram-bot/bot');
    console.log('تم بدء بوت التليجرام بنجاح');
  } catch (error) {
    console.error('فشل بدء بوت التليجرام:', error);
  }
}

// معالجة الإنهاء الآمن
process.on('SIGTERM', () => {
  console.log('تم استلام إشارة SIGTERM، إغلاق الخادم...');
  server.close(() => {
    console.log('تم إغلاق الخادم');
    mongoose.connection.close(false, () => {
      console.log('تم إغلاق اتصال قاعدة البيانات');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('تم استلام إشارة SIGINT، إغلاق الخادم...');
  server.close(() => {
    console.log('تم إغلاق الخادم');
    mongoose.connection.close(false, () => {
      console.log('تم إغلاق اتصال قاعدة البيانات');
      process.exit(0);
    });
  });
});
