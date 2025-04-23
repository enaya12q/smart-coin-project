// خدمات المستخدم باستخدام Supabase
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

// إنشاء مستخدم جديد
async function createUser(userData) {
  // تشفير كلمة المرور
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  
  // حساب تاريخ فتح السحب (بعد 40 يوم من التسجيل)
  const withdrawalUnlockDate = new Date();
  withdrawalUnlockDate.setDate(withdrawalUnlockDate.getDate() + 40);
  
  // إنشاء المستخدم في Supabase
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      referral_code: generateReferralCode(userData.username),
      referred_by: userData.referredBy,
      withdrawal_unlock_date: withdrawalUnlockDate,
      join_date: new Date()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// الحصول على مستخدم بواسطة اسم المستخدم
async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// الحصول على مستخدم بواسطة المعرف
async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// تحديث بيانات المستخدم
async function updateUser(id, updateData) {
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// إعادة تعيين التعدين اليومي
async function resetDailyMining(userId) {
  const now = new Date();
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('last_daily_reset')
    .eq('id', userId)
    .single();
  
  if (userError) throw userError;
  
  const lastReset = new Date(user.last_daily_reset);
  
  if (!lastReset || (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear())) {
    
    const { data, error } = await supabase
      .from('users')
      .update({
        today_mined: 0,
        last_daily_reset: now
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return true;
  }
  
  return false;
}

// التحقق من انتهاء صلاحية الحزمة
async function checkPackageExpiry(userId) {
  const now = new Date();
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('package_expiry, current_package')
    .eq('id', userId)
    .single();
  
  if (userError) throw userError;
  
  if (user.package_expiry && new Date(user.package_expiry) < now) {
    const { data, error } = await supabase
      .from('users')
      .update({
        current_package: null,
        package_expiry: null,
        mining_rate: 1,
        daily_mining_limit: 100
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return true;
  }
  
  return false;
}

// التحقق من أهلية السحب
async function checkWithdrawalEligibility(userId) {
  const now = new Date();
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('withdrawal_unlock_date')
    .eq('id', userId)
    .single();
  
  if (userError) throw userError;
  
  const canWithdraw = now >= new Date(user.withdrawal_unlock_date);
  
  const { data, error } = await supabase
    .from('users')
    .update({
      last_withdrawal_check: now,
      can_withdraw: canWithdraw
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return canWithdraw;
}

// حساب الوقت المتبقي حتى فتح السحب
async function getTimeUntilWithdrawal(userId) {
  const now = new Date();
  const { data: user, error } = await supabase
    .from('users')
    .select('withdrawal_unlock_date, can_withdraw')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  
  const unlockDate = new Date(user.withdrawal_unlock_date);
  
  // إذا كان بالفعل يمكن السحب
  if (user.can_withdraw || now >= unlockDate) {
    return {
      canWithdraw: true,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0
    };
  }
  
  // حساب الفرق بالمللي ثانية
  const diffMs = unlockDate - now;
  
  // تحويل إلى أيام وساعات ودقائق
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    canWithdraw: false,
    daysLeft: diffDays,
    hoursLeft: diffHours,
    minutesLeft: diffMinutes
  };
}

// توليد رمز إحالة فريد
function generateReferralCode(username) {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.substring(0, 3).toUpperCase()}${randomStr}`;
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  updateUser,
  resetDailyMining,
  checkPackageExpiry,
  checkWithdrawalEligibility,
  getTimeUntilWithdrawal
};
