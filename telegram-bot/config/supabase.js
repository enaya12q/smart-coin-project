// ملف الاتصال بـ Supabase لبوت التليجرام
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء عميل Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('خطأ: متغيرات البيئة SUPABASE_URL و SUPABASE_KEY مطلوبة');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
