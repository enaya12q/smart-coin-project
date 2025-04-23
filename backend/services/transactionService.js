// خدمات المعاملات باستخدام Supabase
const supabase = require('../config/supabase');

// إنشاء معاملة جديدة
async function createTransaction(transactionData) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: transactionData.user_id,
      type: transactionData.type,
      amount: transactionData.amount,
      description: transactionData.description,
      status: transactionData.status || 'مكتمل',
      from_user: transactionData.from_user,
      to_user: transactionData.to_user,
      related_payment: transactionData.related_payment,
      related_product: transactionData.related_product,
      product_model: transactionData.product_model
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// الحصول على معاملات المستخدم
async function getUserTransactions(userId, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return data;
}

// الحصول على معاملة بواسطة المعرف
async function getTransactionById(id) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// تحديث حالة المعاملة
async function updateTransactionStatus(id, status) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

module.exports = {
  createTransaction,
  getUserTransactions,
  getTransactionById,
  updateTransactionStatus
};
