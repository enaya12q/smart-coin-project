// ملف اختبار التكامل بين المكونات
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// تحميل متغيرات البيئة
dotenv.config();

// تعريف عنوان API
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// تعريف مصفوفة الاختبارات
const tests = [
  {
    name: 'اختبار اتصال قاعدة البيانات',
    test: async () => {
      try {
        await mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'.green);
        await mongoose.connection.close();
        return true;
      } catch (error) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:'.red, error);
        return false;
      }
    }
  },
  {
    name: 'اختبار تسجيل مستخدم جديد',
    test: async () => {
      try {
        const username = `test_user_${Date.now()}`;
        const response = await axios.post(`${API_URL}/users/register`, {
          username,
          password: 'password123',
          email: `${username}@example.com`
        });
        
        if (response.data.token) {
          console.log('✅ تم تسجيل المستخدم بنجاح'.green);
          // حفظ التوكن للاختبارات اللاحقة
          global.testToken = response.data.token;
          global.testUsername = username;
          return true;
        } else {
          console.error('❌ فشل تسجيل المستخدم: لم يتم إرجاع توكن'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل تسجيل المستخدم:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار تسجيل الدخول',
    test: async () => {
      try {
        if (!global.testUsername) {
          console.error('❌ لم يتم تسجيل مستخدم للاختبار'.red);
          return false;
        }
        
        const response = await axios.post(`${API_URL}/users/login`, {
          username: global.testUsername,
          password: 'password123'
        });
        
        if (response.data.token) {
          console.log('✅ تم تسجيل الدخول بنجاح'.green);
          // تحديث التوكن
          global.testToken = response.data.token;
          return true;
        } else {
          console.error('❌ فشل تسجيل الدخول: لم يتم إرجاع توكن'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل تسجيل الدخول:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار الحصول على معلومات المستخدم',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.get(`${API_URL}/users/me`, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.username === global.testUsername) {
          console.log('✅ تم الحصول على معلومات المستخدم بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل الحصول على معلومات المستخدم: اسم المستخدم غير متطابق'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل الحصول على معلومات المستخدم:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار إنشاء محفظة TON',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.post(`${API_URL}/ton/create-wallet`, {}, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.wallet && response.data.wallet.address) {
          console.log('✅ تم إنشاء محفظة TON بنجاح'.green);
          global.testWalletAddress = response.data.wallet.address;
          return true;
        } else {
          console.error('❌ فشل إنشاء محفظة TON: لم يتم إرجاع عنوان المحفظة'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل إنشاء محفظة TON:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار بدء التعدين',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.post(`${API_URL}/mining/start`, {}, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.success) {
          console.log('✅ تم بدء التعدين بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل بدء التعدين:'.red, response.data.msg);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل بدء التعدين:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار الحصول على حالة التعدين',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.get(`${API_URL}/mining/status`, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.miningActive !== undefined) {
          console.log('✅ تم الحصول على حالة التعدين بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل الحصول على حالة التعدين: البيانات غير مكتملة'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل الحصول على حالة التعدين:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار إيقاف التعدين',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.post(`${API_URL}/mining/stop`, {}, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.success) {
          console.log('✅ تم إيقاف التعدين بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل إيقاف التعدين:'.red, response.data.msg);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل إيقاف التعدين:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار الحصول على رابط الإحالة',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.get(`${API_URL}/referral/link`, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (response.data.referralCode && response.data.referralLink) {
          console.log('✅ تم الحصول على رابط الإحالة بنجاح'.green);
          global.testReferralCode = response.data.referralCode;
          return true;
        } else {
          console.error('❌ فشل الحصول على رابط الإحالة: البيانات غير مكتملة'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل الحصول على رابط الإحالة:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار الحصول على حزم التعدين',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.get(`${API_URL}/mining/packages`, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (Array.isArray(response.data)) {
          console.log('✅ تم الحصول على حزم التعدين بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل الحصول على حزم التعدين: البيانات غير صحيحة'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل الحصول على حزم التعدين:'.red, error.response?.data || error.message);
        return false;
      }
    }
  },
  {
    name: 'اختبار الحصول على بطاقات المتجر',
    test: async () => {
      try {
        if (!global.testToken) {
          console.error('❌ لم يتم تسجيل الدخول للاختبار'.red);
          return false;
        }
        
        const response = await axios.get(`${API_URL}/store/cards`, {
          headers: { 'x-auth-token': global.testToken }
        });
        
        if (Array.isArray(response.data)) {
          console.log('✅ تم الحصول على بطاقات المتجر بنجاح'.green);
          return true;
        } else {
          console.error('❌ فشل الحصول على بطاقات المتجر: البيانات غير صحيحة'.red);
          return false;
        }
      } catch (error) {
        console.error('❌ فشل الحصول على بطاقات المتجر:'.red, error.response?.data || error.message);
        return false;
      }
    }
  }
];

// دالة تشغيل الاختبارات
async function runTests() {
  console.log('\n🧪 بدء اختبارات التكامل لمشروع Smart Coin\n'.cyan.bold);
  
  let passed = 0;
  let failed = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n[${i + 1}/${tests.length}] ${test.name}`.yellow);
    
    const result = await test.test();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 نتائج الاختبارات:'.cyan.bold);
  console.log(`✅ اجتياز: ${passed}`.green);
  console.log(`❌ فشل: ${failed}`.red);
  console.log(`📈 نسبة النجاح: ${Math.round((passed / tests.length) * 100)}%`.yellow);
  
  if (failed === 0) {
    console.log('\n🎉 تم اجتياز جميع الاختبارات بنجاح!'.green.bold);
  } else {
    console.log('\n⚠️ فشلت بعض الاختبارات، يرجى مراجعة النتائج أعلاه.'.yellow.bold);
  }
  
  // إغلاق الاتصالات
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  return { passed, failed, total: tests.length };
}

// تشغيل الاختبارات إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  runTests()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ حدث خطأ أثناء تشغيل الاختبارات:'.red, error);
      process.exit(1);
    });
}

module.exports = { runTests };
