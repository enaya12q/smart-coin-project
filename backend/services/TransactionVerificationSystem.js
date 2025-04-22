const Payment = require('../models/Payment');
const PaymentController = require('../controllers/PaymentController');
const TONWalletService = require('../services/TONWalletService');

// نظام تأكيد المعاملات
const TransactionVerificationSystem = {
  // التحقق من صحة المعاملة
  verifyTransaction: async (transactionId) => {
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
      
      // إنشاء تعليق المعاملة المتوقع
      const expectedComment = `SC_${payment.transactionId}_${payment.userId}`;
      
      // التحقق من المعاملة في شبكة TON
      // في البيئة الحقيقية، سنستخدم tonTransactionHash المخزن في سجل الدفع
      // للاختبار، نستخدم معرف المعاملة كمعرف للمعاملة في شبكة TON
      const verificationResult = await TONWalletService.verifyTransaction(
        payment.tonTransactionHash || payment.transactionId,
        payment.amount,
        expectedComment
      );
      
      // زيادة عدد محاولات التحقق
      payment.verificationAttempts += 1;
      payment.lastVerificationTime = new Date();
      
      if (verificationResult.success) {
        // تحديث حالة الدفع إلى مكتمل
        payment.status = 'completed';
        payment.completedAt = new Date();
        payment.tonTransactionHash = verificationResult.transaction.hash;
        
        // حفظ التغييرات
        await payment.save();
        
        // تفعيل الحزمة المشتراة
        // سيتم تنفيذ هذا في وحدة تحكم منفصلة
        
        return {
          success: true,
          status: 'completed',
          message: 'تم التحقق من الدفع بنجاح',
          packageActivated: true,
          transaction: verificationResult.transaction
        };
      } else {
        // حفظ التغييرات
        await payment.save();
        
        return {
          success: false,
          status: 'pending',
          message: verificationResult.message
        };
      }
    } catch (error) {
      console.error('خطأ في التحقق من صحة المعاملة:', error);
      throw new Error('فشل في التحقق من صحة المعاملة');
    }
  },
  
  // التحقق من صحة المعاملة باستخدام طبقات متعددة
  multiLayerVerification: async (transactionId, userId) => {
    try {
      // طبقة 1: التحقق من وجود المعاملة في قاعدة البيانات
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        return {
          success: false,
          message: 'معاملة غير موجودة',
          verificationLayer: 1
        };
      }
      
      // طبقة 2: التحقق من تطابق معرف المستخدم
      if (payment.userId !== userId) {
        return {
          success: false,
          message: 'معرف المستخدم غير متطابق',
          verificationLayer: 2
        };
      }
      
      // طبقة 3: التحقق من حالة المعاملة
      if (payment.status === 'expired') {
        return {
          success: false,
          message: 'انتهت صلاحية طلب الدفع',
          verificationLayer: 3
        };
      }
      
      if (payment.status === 'failed') {
        return {
          success: false,
          message: 'فشلت عملية الدفع',
          verificationLayer: 3
        };
      }
      
      // طبقة 4: التحقق من المعاملة في شبكة TON
      if (payment.status === 'pending') {
        // التحقق من المعاملة في شبكة TON
        const verificationResult = await TransactionVerificationSystem.verifyTransaction(transactionId);
        
        return verificationResult;
      }
      
      // إذا كانت المعاملة مكتملة بالفعل
      if (payment.status === 'completed') {
        return {
          success: true,
          status: 'completed',
          message: 'تم التحقق من الدفع بنجاح',
          packageActivated: true,
          verificationLayer: 4
        };
      }
      
      // حالة غير متوقعة
      return {
        success: false,
        message: 'حالة معاملة غير معروفة',
        verificationLayer: 4
      };
    } catch (error) {
      console.error('خطأ في التحقق متعدد الطبقات:', error);
      throw new Error('فشل في التحقق متعدد الطبقات');
    }
  },
  
  // التحقق من صحة التوقيع
  verifySignature: (data, signature) => {
    return TONWalletService.verifySignature(data, signature);
  }
};

module.exports = TransactionVerificationSystem;
