// خدمات المحفظة باستخدام Supabase
const supabase = require('../config/supabase');
const userService = require('./userService');
const transactionService = require('./transactionService');

// تحويل عملات إلى مستخدم آخر
async function transferCoins(senderId, recipientUsername, amount, description) {
  // التحقق من وجود المستخدم المستلم
  const recipient = await userService.getUserByUsername(recipientUsername);
  if (!recipient) {
    throw new Error('المستخدم المستلم غير موجود');
  }
  
  // التحقق من أن المستخدم لا يحاول التحويل لنفسه
  if (senderId === recipient.id) {
    throw new Error('لا يمكن التحويل لنفسك');
  }
  
  // الحصول على بيانات المرسل
  const sender = await userService.getUserById(senderId);
  
  // التحقق من كفاية الرصيد
  if (sender.balance < amount) {
    throw new Error('رصيد غير كافٍ');
  }
  
  // بدء معاملة قاعدة البيانات
  // ملاحظة: Supabase لا يدعم المعاملات بشكل مباشر، لذا سنستخدم RPC
  const { data, error } = await supabase.rpc('transfer_coins', {
    sender_id: senderId,
    recipient_id: recipient.id,
    transfer_amount: parseFloat(amount),
    transfer_description: description || `تحويل إلى ${recipient.username}`
  });
  
  if (error) throw error;
  
  return {
    success: true,
    sender: await userService.getUserById(senderId),
    recipient: await userService.getUserById(recipient.id),
    transaction: data.sender_transaction
  };
}

// طلب سحب العملات
async function requestWithdrawal(userId, amount, walletAddress) {
  // التحقق من أهلية السحب
  const canWithdraw = await userService.checkWithdrawalEligibility(userId);
  
  if (!canWithdraw) {
    const withdrawalStatus = await userService.getTimeUntilWithdrawal(userId);
    throw {
      code: 'WITHDRAWAL_NOT_ELIGIBLE',
      message: 'لا يمكن السحب قبل مرور 40 يوم من تاريخ التسجيل',
      withdrawalStatus
    };
  }
  
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  // التحقق من كفاية الرصيد
  if (user.balance < amount) {
    throw new Error('رصيد غير كافٍ');
  }
  
  // الحد الأدنى للسحب
  if (amount < 10) {
    throw new Error('الحد الأدنى للسحب هو 10 عملات');
  }
  
  // إنشاء معاملة سحب معلقة
  const withdrawalTransaction = await transactionService.createTransaction({
    user_id: userId,
    type: 'سحب',
    amount: -parseFloat(amount),
    description: `طلب سحب إلى المحفظة ${walletAddress}`,
    status: 'معلق'
  });
  
  return {
    success: true,
    transaction: withdrawalTransaction
  };
}

// الحصول على معاملات المحفظة
async function getWalletTransactions(userId, limit = 20, offset = 0) {
  return await transactionService.getUserTransactions(userId, limit, offset);
}

module.exports = {
  transferCoins,
  requestWithdrawal,
  getWalletTransactions
};
