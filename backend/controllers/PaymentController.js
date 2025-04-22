const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');

// وحدة التحكم في نظام الدفع
const PaymentController = {
  // إنشاء طلب دفع جديد
  createPayment: async (userId, amount, packageId, description) => {
    try {
      // إنشاء معرف فريد للمعاملة
      const transactionId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // إنشاء تعليق للمعاملة يحتوي على معرف المعاملة ومعرف المستخدم
      // هذا سيساعد في التحقق من المعاملة لاحقاً
      const paymentComment = `SC_${transactionId}_${userId}`;
      
      // إنشاء رابط الدفع باستخدام محفظة TON
      const paymentUrl = `https://ton.org/pay?address=${process.env.TON_WALLET_ADDRESS}&amount=${amount}&comment=${paymentComment}`;
      
      // تاريخ انتهاء صلاحية طلب الدفع (30 دقيقة من الآن)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      
      // إنشاء سجل دفع جديد في قاعدة البيانات
      const newPayment = new Payment({
        transactionId,
        userId,
        amount,
        packageId,
        description,
        paymentUrl,
        expiresAt
      });
      
      // حفظ سجل الدفع
      await newPayment.save();
      
      return {
        success: true,
        transactionId,
        paymentUrl,
        expiresAt
      };
    } catch (error) {
      console.error('خطأ في إنشاء طلب الدفع:', error);
      throw new Error('فشل في إنشاء طلب الدفع');
    }
  },
  
  // التحقق من حالة الدفع
  verifyPayment: async (transactionId) => {
    try {
      // البحث عن سجل الدفع في قاعدة البيانات
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        return {
          success: false,
          message: 'معاملة غير موجودة'
        };
      }
      
      // التحقق من انتهاء صلاحية طلب الدفع
      if (payment.status === 'expired' || new Date() > payment.expiresAt) {
        // تحديث حالة الدفع إلى منتهي الصلاحية إذا لم يكن كذلك بالفعل
        if (payment.status !== 'expired') {
          payment.status = 'expired';
          await payment.save();
        }
        
        return {
          success: false,
          status: 'expired',
          message: 'انتهت صلاحية طلب الدفع'
        };
      }
      
      // إذا كانت المعاملة مكتملة بالفعل، نعيد حالتها
      if (payment.status === 'completed') {
        return {
          success: true,
          status: 'completed',
          message: 'تم التحقق من الدفع بنجاح',
          packageActivated: true
        };
      }
      
      // زيادة عدد محاولات التحقق
      payment.verificationAttempts += 1;
      payment.lastVerificationTime = new Date();
      
      // استعلام من واجهة برمجة تطبيقات TON للتحقق من المعاملة
      // هذا مجرد مثال، في التطبيق الحقيقي سنستخدم واجهة برمجة تطبيقات TON الفعلية
      
      // محاكاة الاستعلام من واجهة برمجة تطبيقات TON
      // في التطبيق الحقيقي، سنستخدم مكتبة ton-client-js أو tonweb للاستعلام عن المعاملة
      
      // للاختبار، نفترض أن الدفع تم بنجاح بعد 3 محاولات تحقق
      let paymentStatus;
      if (payment.verificationAttempts >= 3) {
        paymentStatus = 'completed';
        payment.status = 'completed';
        payment.completedAt = new Date();
        payment.tonTransactionHash = `ton_hash_${Math.random().toString(36).substring(2, 15)}`;
      } else {
        paymentStatus = 'pending';
      }
      
      // حفظ التغييرات
      await payment.save();
      
      if (paymentStatus === 'completed') {
        // تفعيل الحزمة المشتراة
        // سيتم تنفيذ هذا في وحدة تحكم منفصلة
        
        return {
          success: true,
          status: paymentStatus,
          message: 'تم التحقق من الدفع بنجاح',
          packageActivated: true
        };
      } else {
        return {
          success: true,
          status: paymentStatus,
          message: 'لا يزال الدفع قيد المعالجة، يرجى الانتظار'
        };
      }
    } catch (error) {
      console.error('خطأ في التحقق من حالة الدفع:', error);
      throw new Error('فشل في التحقق من حالة الدفع');
    }
  },
  
  // معالجة إشعار الدفع من الويب هوك
  handlePaymentWebhook: async (data, signature) => {
    try {
      // التحقق من صحة التوقيع
      const isValidSignature = PaymentController.verifyWebhookSignature(data, signature);
      
      if (!isValidSignature) {
        return {
          success: false,
          message: 'توقيع غير صالح'
        };
      }
      
      const { transactionId, status, tonTransactionHash } = data;
      
      // البحث عن سجل الدفع في قاعدة البيانات
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        return {
          success: false,
          message: 'معاملة غير موجودة'
        };
      }
      
      // تحديث حالة الدفع
      payment.status = status;
      
      if (status === 'completed') {
        payment.completedAt = new Date();
        payment.tonTransactionHash = tonTransactionHash;
        
        // تفعيل الحزمة المشتراة
        // سيتم تنفيذ هذا في وحدة تحكم منفصلة
      }
      
      // حفظ التغييرات
      await payment.save();
      
      return {
        success: true,
        message: 'تم معالجة إشعار الدفع بنجاح'
      };
    } catch (error) {
      console.error('خطأ في معالجة إشعار الدفع:', error);
      throw new Error('فشل في معالجة إشعار الدفع');
    }
  },
  
  // التحقق من صحة توقيع الويب هوك
  verifyWebhookSignature: (data, signature) => {
    try {
      // إنشاء سلسلة من البيانات للتوقيع
      const dataString = JSON.stringify(data);
      
      // إنشاء توقيع باستخدام المفتاح السري
      const expectedSignature = crypto
        .createHmac('sha256', process.env.TON_API_KEY)
        .update(dataString)
        .digest('hex');
      
      // مقارنة التوقيع المتوقع مع التوقيع المستلم
      return expectedSignature === signature;
    } catch (error) {
      console.error('خطأ في التحقق من صحة التوقيع:', error);
      return false;
    }
  },
  
  // الحصول على سجل المدفوعات للمستخدم
  getPaymentHistory: async (userId) => {
    try {
      // البحث عن سجلات الدفع للمستخدم
      const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
      
      // تنسيق البيانات للعرض
      const formattedPayments = payments.map(payment => ({
        id: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        timestamp: payment.createdAt,
        packageId: payment.packageId,
        completedAt: payment.completedAt
      }));
      
      return {
        success: true,
        payments: formattedPayments
      };
    } catch (error) {
      console.error('خطأ في الحصول على سجل المدفوعات:', error);
      throw new Error('فشل في الحصول على سجل المدفوعات');
    }
  }
};

module.exports = PaymentController;
