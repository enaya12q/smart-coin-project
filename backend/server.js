const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');

// تحميل متغيرات البيئة
dotenv.config();

// استيراد المسارات
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallet');
const miningRoutes = require('./routes/mining');
const storeRoutes = require('./routes/store');
const referralRoutes = require('./routes/referral');
const paymentRoutes = require('./routes/payment');

// إنشاء تطبيق Express
const app = express();

// الإعدادات الأساسية
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تكوين المسارات
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/mining', miningRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/payment', paymentRoutes);

// خدمة الملفات الثابتة في بيئة الإنتاج
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// معالجة الأخطاء
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('تم الاتصال بقاعدة البيانات بنجاح');
})
.catch((err) => {
  console.error('فشل الاتصال بقاعدة البيانات:', err.message);
  process.exit(1);
});

// تشغيل الخادم
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});

module.exports = app;
