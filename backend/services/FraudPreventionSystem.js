const crypto = require('crypto');
const Payment = require('../models/Payment');
const TONWalletService = require('../services/TONWalletService');

// نظام الحماية ضد التحايل والنصب
const FraudPreventionSystem = {
  // التحقق من صحة طلب الدفع
  validatePaymentRequest: async (userId, amount, packageId) => {
    try {
      // التحقق من وجود طلبات دفع معلقة للمستخدم نفسه
      const pendingPayments = await Payment.find({
        userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });
      
      // إذا كان هناك أكثر من 3 طلبات دفع معلقة، نرفض الطلب الجديد
      if (pendingPayments.length >= 3) {
        return {
          success: false,
          message: 'لديك عدة طلبات دفع معلقة. يرجى إكمال الطلبات الحالية أو الانتظار حتى انتهاء صلاحيتها.',
          pendingPayments: pendingPayments.map(p => ({
            transactionId: p.transactionId,
            amount: p.amount,
            createdAt: p.createdAt,
            expiresAt: p.expiresAt
          }))
        };
      }
      
      // التحقق من تكرار المبلغ نفسه في فترة زمنية قصيرة (للحماية من هجمات التكرار)
      const recentSimilarPayments = await Payment.find({
        userId,
        amount,
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // آخر 5 دقائق
      });
      
      if (recentSimilarPayments.length >= 2) {
        return {
          success: false,
          message: 'تم اكتشاف طلبات متكررة بنفس المبلغ. يرجى الانتظار قبل إجراء طلب جديد.',
          cooldownSeconds: 300 // 5 دقائق
        };
      }
      
      // التحقق من صحة المبلغ (يجب أن يكون موجباً وضمن النطاق المسموح به)
      if (amount <= 0 || amount > 100) {
        return {
          success: false,
          message: 'المبلغ غير صالح. يجب أن يكون المبلغ موجباً وأقل من 100 TON.'
        };
      }
      
      // التحقق من صحة معرف الحزمة
      // هنا يمكن إضافة منطق للتحقق من وجود الحزمة وسعرها
      
      return {
        success: true,
        message: 'تم التحقق من صحة طلب الدفع'
      };
    } catch (error) {
      console.error('خطأ في التحقق من صحة طلب الدفع:', error);
      throw new Error('فشل في التحقق من صحة طلب الدفع');
    }
  },
  
  // التحقق من نمط الاحتيال
  detectFraudPattern: async (userId) => {
    try {
      // الحصول على سجل المدفوعات للمستخدم
      const userPayments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(20);
      
      // التحقق من وجود عدد كبير من المدفوعات الفاشلة
      const failedPayments = userPayments.filter(p => p.status === 'failed');
      
      if (failedPayments.length >= 5) {
        return {
          success: false,
          fraudDetected: true,
          reason: 'عدد كبير من المدفوعات الفاشلة',
          riskLevel: 'high'
        };
      }
      
      // التحقق من وجود عدد كبير من المدفوعات المنتهية الصلاحية
      const expiredPayments = userPayments.filter(p => p.status === 'expired');
      
      if (expiredPayments.length >= 7) {
        return {
          success: false,
          fraudDetected: true,
          reason: 'عدد كبير من المدفوعات المنتهية الصلاحية',
          riskLevel: 'medium'
        };
      }
      
      // التحقق من وجود نمط زمني مشبوه (مثل إنشاء عدة طلبات في وقت قصير جداً)
      if (userPayments.length >= 3) {
        const timeGaps = [];
        
        for (let i = 0; i < userPayments.length - 1; i++) {
          const gap = userPayments[i].createdAt - userPayments[i + 1].createdAt;
          timeGaps.push(gap);
        }
        
        // حساب متوسط الفجوة الزمنية بين الطلبات
        const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
        
        // إذا كان متوسط الفجوة الزمنية أقل من 30 ثانية، فهذا مشبوه
        if (avgGap < 30 * 1000 && userPayments.length >= 5) {
          return {
            success: false,
            fraudDetected: true,
            reason: 'نمط زمني مشبوه',
            riskLevel: 'medium'
          };
        }
      }
      
      // لم يتم اكتشاف نمط احتيال
      return {
        success: true,
        fraudDetected: false,
        riskLevel: 'low'
      };
    } catch (error) {
      console.error('خطأ في اكتشاف نمط الاحتيال:', error);
      throw new Error('فشل في اكتشاف نمط الاحتيال');
    }
  },
  
  // إنشاء رمز تحقق للمعاملات الحساسة
  generateVerificationToken: (userId, transactionId) => {
    try {
      // إنشاء بيانات للتشفير
      const data = `${userId}_${transactionId}_${Date.now()}`;
      
      // إنشاء رمز تحقق باستخدام HMAC-SHA256
      const token = crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(data)
        .digest('hex')
        .substring(0, 6); // رمز من 6 أرقام
      
      return {
        success: true,
        token,
        expiresIn: 300 // 5 دقائق
      };
    } catch (error) {
      console.error('خطأ في إنشاء رمز التحقق:', error);
      throw new Error('فشل في إنشاء رمز التحقق');
    }
  },
  
  // التحقق من صحة رمز التحقق
  verifyToken: (userId, transactionId, token, originalToken) => {
    try {
      // التحقق من تطابق الرمز
      return token === originalToken;
    } catch (error) {
      console.error('خطأ في التحقق من صحة رمز التحقق:', error);
      return false;
    }
  },
  
  // تسجيل محاولة احتيال
  logFraudAttempt: async (userId, reason, details) => {
    try {
      // هنا يمكن إضافة منطق لتسجيل محاولة الاحتيال في قاعدة البيانات
      // وإرسال إشعار للمسؤولين
      
      console.warn(`محاولة احتيال محتملة: المستخدم ${userId}, السبب: ${reason}, التفاصيل:`, details);
      
      // يمكن إضافة منطق لحظر المستخدم مؤقتاً أو دائماً حسب خطورة المحاولة
      
      return {
        success: true,
        message: 'تم تسجيل محاولة الاحتيال'
      };
    } catch (error) {
      console.error('خطأ في تسجيل محاولة الاحتيال:', error);
      throw new Error('فشل في تسجيل محاولة الاحتيال');
    }
  }
};

module.exports = FraudPreventionSystem;
