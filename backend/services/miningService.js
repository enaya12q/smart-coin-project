// خدمات التعدين باستخدام Supabase
const supabase = require('../config/supabase');
const userService = require('./userService');
const transactionService = require('./transactionService');

// بدء عملية التعدين
async function startMining(userId) {
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new Error('المستخدم غير موجود');
  }
  
  // التحقق من حالة التعدين
  if (user.mining_active) {
    throw new Error('التعدين نشط بالفعل');
  }
  
  // إعادة تعيين التعدين اليومي إذا لزم الأمر
  await userService.resetDailyMining(userId);
  
  // التحقق من انتهاء صلاحية الحزمة
  await userService.checkPackageExpiry(userId);
  
  // تحديث حالة التعدين
  const { data, error } = await supabase
    .from('users')
    .update({
      mining_active: true,
      last_mining_time: new Date()
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}

// إيقاف عملية التعدين وجمع المكافآت
async function stopMining(userId) {
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new Error('المستخدم غير موجود');
  }
  
  // التحقق من حالة التعدين
  if (!user.mining_active) {
    throw new Error('التعدين غير نشط');
  }
  
  // حساب الوقت المنقضي منذ آخر تعدين
  const now = new Date();
  const lastMiningTime = new Date(user.last_mining_time);
  const elapsedHours = (now - lastMiningTime) / (1000 * 60 * 60);
  
  // حساب المكافأة
  const mineReward = parseFloat(process.env.MINE_REWARD);
  const miningRate = user.mining_rate || 1;
  const reward = Math.min(
    mineReward * miningRate * Math.floor(elapsedHours),
    user.daily_mining_limit - user.today_mined
  );
  
  // إذا كان الوقت المنقضي أقل من ساعة، لا توجد مكافأة
  if (elapsedHours < 1) {
    throw new Error('يجب أن تنتظر على الأقل ساعة واحدة للحصول على مكافأة');
  }
  
  // إذا تجاوز الحد اليومي، لا توجد مكافأة
  if (user.today_mined >= user.daily_mining_limit) {
    throw new Error('لقد وصلت إلى الحد اليومي للتعدين');
  }
  
  // تحديث بيانات المستخدم
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      mining_active: false,
      balance: user.balance + reward,
      today_mined: user.today_mined + reward
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // إنشاء معاملة للمكافأة
  const transaction = await transactionService.createTransaction({
    user_id: userId,
    type: 'تعدين',
    amount: reward,
    description: `مكافأة تعدين (${Math.floor(elapsedHours)} ساعة)`
  });
  
  return {
    user: updatedUser,
    reward,
    transaction
  };
}

// الحصول على حزم التعدين
async function getMiningPackages() {
  const { data, error } = await supabase
    .from('mining_packages')
    .select('*')
    .order('price', { ascending: true });
  
  if (error) throw error;
  
  return data;
}

// شراء حزمة تعدين
async function purchaseMiningPackage(userId, packageId) {
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new Error('المستخدم غير موجود');
  }
  
  // الحصول على بيانات الحزمة
  const { data: miningPackage, error: packageError } = await supabase
    .from('mining_packages')
    .select('*')
    .eq('id', packageId)
    .single();
  
  if (packageError) throw packageError;
  if (!miningPackage) {
    throw new Error('حزمة التعدين غير موجودة');
  }
  
  // التحقق من كفاية الرصيد
  if (user.balance < miningPackage.price) {
    throw new Error('رصيد غير كافٍ');
  }
  
  // حساب تاريخ انتهاء الصلاحية
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + miningPackage.duration_days);
  
  // تحديث بيانات المستخدم
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      balance: user.balance - miningPackage.price,
      mining_rate: miningPackage.mining_rate,
      daily_mining_limit: miningPackage.daily_limit,
      current_package: packageId,
      package_expiry: expiryDate
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // إنشاء معاملة للشراء
  const transaction = await transactionService.createTransaction({
    user_id: userId,
    type: 'شراء',
    amount: -miningPackage.price,
    description: `شراء حزمة تعدين: ${miningPackage.name}`,
    related_product: packageId,
    product_model: 'mining_packages'
  });
  
  return {
    user: updatedUser,
    package: miningPackage,
    transaction
  };
}

// الحصول على إحصائيات التعدين
async function getMiningStats(userId) {
  // الحصول على بيانات المستخدم
  const user = await userService.getUserById(userId);
  
  if (!user) {
    throw new Error('المستخدم غير موجود');
  }
  
  // الحصول على إجمالي المعدن
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'تعدين');
  
  if (transactionsError) throw transactionsError;
  
  const totalMined = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // الحصول على بيانات الحزمة الحالية
  let currentPackage = null;
  if (user.current_package) {
    const { data: package, error: packageError } = await supabase
      .from('mining_packages')
      .select('*')
      .eq('id', user.current_package)
      .single();
    
    if (!packageError) {
      currentPackage = package;
    }
  }
  
  return {
    miningRate: user.mining_rate,
    dailyLimit: user.daily_mining_limit,
    todayMined: user.today_mined,
    totalMined,
    miningActive: user.mining_active,
    lastMiningTime: user.last_mining_time,
    currentPackage,
    packageExpiry: user.package_expiry
  };
}

module.exports = {
  startMining,
  stopMining,
  getMiningPackages,
  purchaseMiningPackage,
  getMiningStats
};
