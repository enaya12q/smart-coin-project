// ملف اختبار وظائف Supabase
const supabase = require('./config/supabase');
const userService = require('./services/userService');
const transactionService = require('./services/transactionService');
const walletService = require('./services/walletService');
const miningService = require('./services/miningService');
const referralService = require('./services/referralService');

async function runTests() {
  console.log('بدء اختبار وظائف Supabase...');
  
  try {
    // اختبار الاتصال بـ Supabase
    console.log('\n1. اختبار الاتصال بـ Supabase:');
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw new Error(`فشل الاتصال بـ Supabase: ${error.message}`);
    console.log('✅ تم الاتصال بـ Supabase بنجاح!');
    
    // اختبار إنشاء مستخدم جديد
    console.log('\n2. اختبار إنشاء مستخدم جديد:');
    const testUsername = `test_user_${Date.now()}`;
    const userData = {
      username: testUsername,
      email: `${testUsername}@example.com`,
      password: 'password123'
    };
    
    const newUser = await userService.createUser(userData);
    if (!newUser || !newUser.id) throw new Error('فشل إنشاء المستخدم الجديد');
    console.log(`✅ تم إنشاء المستخدم الجديد بنجاح! معرف المستخدم: ${newUser.id}`);
    
    // اختبار الحصول على مستخدم بواسطة اسم المستخدم
    console.log('\n3. اختبار الحصول على مستخدم بواسطة اسم المستخدم:');
    const retrievedUser = await userService.getUserByUsername(testUsername);
    if (!retrievedUser || retrievedUser.username !== testUsername) 
      throw new Error('فشل الحصول على المستخدم بواسطة اسم المستخدم');
    console.log('✅ تم الحصول على المستخدم بنجاح!');
    
    // اختبار تحديث بيانات المستخدم
    console.log('\n4. اختبار تحديث بيانات المستخدم:');
    const updatedUser = await userService.updateUser(newUser.id, { balance: 100 });
    if (!updatedUser || updatedUser.balance !== 100) 
      throw new Error('فشل تحديث بيانات المستخدم');
    console.log('✅ تم تحديث بيانات المستخدم بنجاح!');
    
    // اختبار إنشاء معاملة
    console.log('\n5. اختبار إنشاء معاملة:');
    const transactionData = {
      user_id: newUser.id,
      type: 'إيداع',
      amount: 50,
      description: 'اختبار إنشاء معاملة'
    };
    
    const newTransaction = await transactionService.createTransaction(transactionData);
    if (!newTransaction || !newTransaction.id) throw new Error('فشل إنشاء المعاملة');
    console.log(`✅ تم إنشاء المعاملة بنجاح! معرف المعاملة: ${newTransaction.id}`);
    
    // اختبار الحصول على معاملات المستخدم
    console.log('\n6. اختبار الحصول على معاملات المستخدم:');
    const transactions = await transactionService.getUserTransactions(newUser.id);
    if (!transactions || transactions.length === 0) 
      throw new Error('فشل الحصول على معاملات المستخدم');
    console.log(`✅ تم الحصول على معاملات المستخدم بنجاح! عدد المعاملات: ${transactions.length}`);
    
    // تنظيف بيانات الاختبار
    console.log('\n7. تنظيف بيانات الاختبار:');
    await supabase.from('transactions').delete().eq('id', newTransaction.id);
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('✅ تم تنظيف بيانات الاختبار بنجاح!');
    
    console.log('\n✅✅✅ تم اجتياز جميع الاختبارات بنجاح! ✅✅✅');
    return true;
  } catch (err) {
    console.error('\n❌ فشل الاختبار:', err.message);
    return false;
  }
}

// تنفيذ الاختبارات
runTests()
  .then(success => {
    if (success) {
      console.log('اختبار الوظائف ناجح');
      process.exit(0);
    } else {
      console.error('فشل اختبار الوظائف');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('حدث خطأ غير متوقع:', err);
    process.exit(1);
  });
