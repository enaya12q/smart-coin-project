const Payment = require('../models/Payment');
const TONWalletService = require('../services/TONWalletService');
const TransactionVerificationSystem = require('../services/TransactionVerificationSystem');
const FraudPreventionSystem = require('../services/FraudPreventionSystem');
const { EventEmitter } = require('events');

// إنشاء مُصدر الأحداث
const paymentEventEmitter = new EventEmitter();

// نظام تتبع حالة الدفع في الوقت الحقيقي
const RealTimePaymentTracker = {
  // بدء تتبع معاملة
  startTracking: async (transactionId, userId) => {
    try {
      // التحقق من وجود المعاملة
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        return {
          success: false,
          message: 'معاملة غير موجودة'
        };
      }
      
      // التحقق من أن المعاملة تخص المستخدم نفسه
      if (payment.userId !== userId) {
        return {
          success: false,
          message: 'غير مصرح لك بتتبع هذه المعاملة'
        };
      }
      
      // إنشاء معرف فريد للتتبع
      const trackingId = `track_${transactionId}_${Date.now()}`;
      
      // تخزين معلومات التتبع
      RealTimePaymentTracker.trackingInfo[trackingId] = {
        transactionId,
        userId,
        startTime: Date.now(),
        lastCheckTime: Date.now(),
        status: payment.status,
        checkCount: 0,
        isActive: true
      };
      
      // جدولة عملية التحقق الأولى
      setTimeout(() => {
        RealTimePaymentTracker.checkPaymentStatus(trackingId);
      }, 5000); // بدء التحقق بعد 5 ثوانٍ
      
      return {
        success: true,
        trackingId,
        message: 'تم بدء تتبع المعاملة بنجاح',
        initialStatus: payment.status
      };
    } catch (error) {
      console.error('خطأ في بدء تتبع المعاملة:', error);
      throw new Error('فشل في بدء تتبع المعاملة');
    }
  },
  
  // التحقق من حالة الدفع
  checkPaymentStatus: async (trackingId) => {
    try {
      // الحصول على معلومات التتبع
      const trackingInfo = RealTimePaymentTracker.trackingInfo[trackingId];
      
      if (!trackingInfo || !trackingInfo.isActive) {
        return;
      }
      
      // تحديث وقت آخر تحقق
      trackingInfo.lastCheckTime = Date.now();
      trackingInfo.checkCount += 1;
      
      // الحصول على حالة المعاملة من قاعدة البيانات
      const payment = await Payment.findOne({ transactionId: trackingInfo.transactionId });
      
      if (!payment) {
        // إذا لم يتم العثور على المعاملة، نوقف التتبع
        trackingInfo.isActive = false;
        paymentEventEmitter.emit('payment_error', {
          trackingId,
          error: 'معاملة غير موجودة'
        });
        return;
      }
      
      // التحقق من تغير الحالة
      if (payment.status !== trackingInfo.status) {
        // تحديث الحالة
        const oldStatus = trackingInfo.status;
        trackingInfo.status = payment.status;
        
        // إرسال حدث تغير الحالة
        paymentEventEmitter.emit('status_changed', {
          trackingId,
          transactionId: trackingInfo.transactionId,
          oldStatus,
          newStatus: payment.status,
          timestamp: new Date()
        });
        
        // إذا كانت الحالة النهائية (مكتملة أو فاشلة أو منتهية الصلاحية)، نوقف التتبع
        if (['completed', 'failed', 'expired'].includes(payment.status)) {
          trackingInfo.isActive = false;
          
          // إرسال حدث انتهاء التتبع
          paymentEventEmitter.emit('tracking_completed', {
            trackingId,
            transactionId: trackingInfo.transactionId,
            finalStatus: payment.status,
            duration: Date.now() - trackingInfo.startTime
          });
          
          return;
        }
      }
      
      // إذا كانت المعاملة لا تزال معلقة، نقوم بالتحقق من حالتها في شبكة TON
      if (payment.status === 'pending') {
        // التحقق من المعاملة في شبكة TON
        const verificationResult = await TransactionVerificationSystem.verifyTransaction(trackingInfo.transactionId);
        
        // إذا تغيرت الحالة نتيجة للتحقق، نرسل حدث تغير الحالة
        if (verificationResult.success && verificationResult.status === 'completed') {
          paymentEventEmitter.emit('status_changed', {
            trackingId,
            transactionId: trackingInfo.transactionId,
            oldStatus: 'pending',
            newStatus: 'completed',
            timestamp: new Date()
          });
          
          // إيقاف التتبع
          trackingInfo.isActive = false;
          trackingInfo.status = 'completed';
          
          // إرسال حدث انتهاء التتبع
          paymentEventEmitter.emit('tracking_completed', {
            trackingId,
            transactionId: trackingInfo.transactionId,
            finalStatus: 'completed',
            duration: Date.now() - trackingInfo.startTime
          });
          
          return;
        }
      }
      
      // جدولة التحقق التالي إذا كان التتبع لا يزال نشطاً
      if (trackingInfo.isActive) {
        // زيادة الفاصل الزمني تدريجياً لتقليل الحمل على الخادم
        const interval = Math.min(30000, 5000 + trackingInfo.checkCount * 1000); // بحد أقصى 30 ثانية
        
        setTimeout(() => {
          RealTimePaymentTracker.checkPaymentStatus(trackingId);
        }, interval);
      }
    } catch (error) {
      console.error('خطأ في التحقق من حالة الدفع:', error);
      
      // إرسال حدث خطأ
      paymentEventEmitter.emit('payment_error', {
        trackingId,
        error: error.message
      });
    }
  },
  
  // إيقاف تتبع معاملة
  stopTracking: (trackingId) => {
    try {
      // الحصول على معلومات التتبع
      const trackingInfo = RealTimePaymentTracker.trackingInfo[trackingId];
      
      if (!trackingInfo) {
        return {
          success: false,
          message: 'معرف تتبع غير صالح'
        };
      }
      
      // إيقاف التتبع
      trackingInfo.isActive = false;
      
      // إرسال حدث إيقاف التتبع
      paymentEventEmitter.emit('tracking_stopped', {
        trackingId,
        transactionId: trackingInfo.transactionId,
        duration: Date.now() - trackingInfo.startTime
      });
      
      return {
        success: true,
        message: 'تم إيقاف تتبع المعاملة بنجاح'
      };
    } catch (error) {
      console.error('خطأ في إيقاف تتبع المعاملة:', error);
      throw new Error('فشل في إيقاف تتبع المعاملة');
    }
  },
  
  // الحصول على حالة التتبع
  getTrackingStatus: (trackingId) => {
    try {
      // الحصول على معلومات التتبع
      const trackingInfo = RealTimePaymentTracker.trackingInfo[trackingId];
      
      if (!trackingInfo) {
        return {
          success: false,
          message: 'معرف تتبع غير صالح'
        };
      }
      
      return {
        success: true,
        trackingInfo: {
          transactionId: trackingInfo.transactionId,
          status: trackingInfo.status,
          isActive: trackingInfo.isActive,
          startTime: new Date(trackingInfo.startTime),
          lastCheckTime: new Date(trackingInfo.lastCheckTime),
          checkCount: trackingInfo.checkCount,
          duration: Date.now() - trackingInfo.startTime
        }
      };
    } catch (error) {
      console.error('خطأ في الحصول على حالة التتبع:', error);
      throw new Error('فشل في الحصول على حالة التتبع');
    }
  },
  
  // الاشتراك في أحداث الدفع
  subscribeToEvents: (event, callback) => {
    paymentEventEmitter.on(event, callback);
    
    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      paymentEventEmitter.off(event, callback);
    };
  },
  
  // تخزين معلومات التتبع
  trackingInfo: {}
};

// تصدير النظام
module.exports = RealTimePaymentTracker;
