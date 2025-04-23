// خدمات الإحالة باستخدام Supabase
const supabase = require('../config/supabase');
const userService = require('./userService');
const transactionService = require('./transactionService');

// الحصول على رابط الإحالة للمستخدم
async function getReferralLink(userId) {
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new Error('المستخدم غير موجود');
  }
  
  // إنشاء رمز إحالة إذا لم يكن موجودًا
  if (!user.referral_code) {
    const referralCode = generateReferralCode(user.username);
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ referral_code: referralCode })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    user.referral_code = updatedUser.referral_code;
  }
  
  // إنشاء رابط الإحالة
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const referralLink = `${baseUrl}/register?ref=${user.referral_code}`;
  
  // الحصول على إحصائيات الإحالة
  const referralStats = await getReferralStats(userId);
  
  return {
    referralCode: user.referral_code,
    referralLink,
    referralStats
  };
}

// الحصول على إحصائيات الإحالة
async function getReferralStats(userId) {
  // الحصول على عدد المستخدمين المُحالين
  const { count: totalReferrals, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId);
  
  if (countError) throw countError;
  
  // الحصول على إجمالي المكافآت
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'إحالة');
  
  if (transactionsError) throw transactionsError;
  
  const totalRewards = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  return {
    totalReferrals: totalReferrals || 0,
    totalRewards: totalRewards || 0
  };
}

// الحصول على المستخدمين المُحالين
async function getReferredUsers(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, join_date')
    .eq('referred_by', userId)
    .order('join_date', { ascending: false });
  
  if (error) throw error;
  
  // الحصول على مكافآت الإحالة لكل مستخدم
  const referredUsers = [];
  
  for (const user of data) {
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'إحالة')
      .eq('from_user', user.id);
    
    if (transactionsError) throw transactionsError;
    
    const referralReward = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    referredUsers.push({
      ...user,
      referralReward: referralReward || 0
    });
  }
  
  return referredUsers;
}

// معالجة الإحالة عند تسجيل مستخدم جديد
async function processReferral(newUserId, referrerId) {
  // الحصول على بيانات المستخدم المُحيل
  const referrer = await userService.getUserById(referrerId);
  
  if (!referrer) {
    throw new Error('المستخدم المُحيل غير موجود');
  }
  
  // الحصول على بيانات المستخدم الجديد
  const newUser = await userService.getUserById(newUserId);
  
  if (!newUser) {
    throw new Error('المستخدم الجديد غير موجود');
  }
  
  // حساب مكافأة الإحالة
  const referralBonus = parseFloat(process.env.REFERRAL_BONUS) || 15;
  
  // تحديث رصيد المستخدم المُحيل
  const { data: updatedReferrer, error: updateError } = await supabase
    .from('users')
    .update({ balance: referrer.balance + referralBonus })
    .eq('id', referrerId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // إنشاء معاملة للمكافأة
  const transaction = await transactionService.createTransaction({
    user_id: referrerId,
    type: 'إحالة',
    amount: referralBonus,
    description: `مكافأة إحالة المستخدم ${newUser.username}`,
    from_user: newUserId
  });
  
  return {
    referrer: updatedReferrer,
    bonus: referralBonus,
    transaction
  };
}

// توليد رمز إحالة فريد
function generateReferralCode(username) {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.substring(0, 3).toUpperCase()}${randomStr}`;
}

module.exports = {
  getReferralLink,
  getReferralStats,
  getReferredUsers,
  processReferral
};
