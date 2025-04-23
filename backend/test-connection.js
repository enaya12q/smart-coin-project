// ملف اختبار اتصال Supabase
const supabase = require('./config/supabase');

async function testSupabaseConnection() {
  try {
    console.log('اختبار الاتصال بـ Supabase...');
    
    // اختبار الاتصال من خلال استعلام بسيط
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('فشل الاتصال بـ Supabase:', error.message);
      return false;
    }
    
    console.log('تم الاتصال بـ Supabase بنجاح!');
    console.log('عدد المستخدمين في قاعدة البيانات:', data);
    return true;
  } catch (err) {
    console.error('حدث خطأ أثناء اختبار الاتصال بـ Supabase:', err.message);
    return false;
  }
}

// تنفيذ الاختبار
testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('اختبار الاتصال ناجح');
      process.exit(0);
    } else {
      console.error('فشل اختبار الاتصال');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('حدث خطأ غير متوقع:', err);
    process.exit(1);
  });
