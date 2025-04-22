const TonWeb = require('tonweb');
const { mnemonicToKeyPair } = require('tonweb-mnemonic');

// إعداد TonWeb مع مزود HTTP
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
  apiKey: process.env.TON_API_KEY
}));

// دالة لإنشاء محفظة TON جديدة
async function createWallet() {
  try {
    // توليد كلمات استرجاع عشوائية (24 كلمة)
    const mnemonic = await TonWeb.utils.mnemonicNew();
    
    // تحويل الكلمات إلى زوج مفاتيح
    const keyPair = await mnemonicToKeyPair(mnemonic);
    
    // إنشاء كائن المحفظة
    const WalletClass = tonweb.wallet.all.v4R2;
    const wallet = new WalletClass(tonweb.provider, {
      publicKey: keyPair.publicKey,
      wc: 0 // workchain
    });
    
    // الحصول على عنوان المحفظة
    const address = await wallet.getAddress();
    const addressString = address.toString(true, true, true);
    
    return {
      mnemonic,
      keyPair,
      address: addressString,
      wallet
    };
  } catch (error) {
    console.error('خطأ في إنشاء محفظة TON:', error);
    throw error;
  }
}

// دالة للحصول على رصيد المحفظة
async function getWalletBalance(address) {
  try {
    const balance = await tonweb.provider.getBalance(address);
    return TonWeb.utils.fromNano(balance);
  } catch (error) {
    console.error('خطأ في الحصول على رصيد المحفظة:', error);
    throw error;
  }
}

// دالة لإرسال TON
async function sendTON(fromWallet, keyPair, toAddress, amount, comment = '') {
  try {
    // تحويل المبلغ إلى نانو TON
    const amountNano = TonWeb.utils.toNano(amount);
    
    // إنشاء معاملة
    const seqno = await fromWallet.methods.seqno().call() || 0;
    
    // إعداد المعاملة
    const transaction = fromWallet.methods.transfer({
      secretKey: keyPair.secretKey,
      toAddress: toAddress,
      amount: amountNano,
      seqno: seqno,
      payload: comment ? TonWeb.utils.stringToBytes(comment) : '',
      sendMode: 3
    });
    
    // إرسال المعاملة
    const result = await transaction.send();
    
    return {
      success: true,
      transactionId: result,
      message: 'تم إرسال المعاملة بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إرسال TON:', error);
    throw error;
  }
}

// دالة لإنشاء رابط دفع TON
function createTONPaymentLink(address, amount, comment = '') {
  try {
    // تنسيق المبلغ بالنانو TON
    const amountNano = TonWeb.utils.toNano(amount);
    
    // إنشاء رابط الدفع
    let paymentLink = `ton://transfer/${address}?amount=${amountNano}`;
    
    // إضافة تعليق إذا وجد
    if (comment) {
      paymentLink += `&text=${encodeURIComponent(comment)}`;
    }
    
    return paymentLink;
  } catch (error) {
    console.error('خطأ في إنشاء رابط دفع TON:', error);
    throw error;
  }
}

// دالة للتحقق من صحة عنوان TON
function isValidTONAddress(address) {
  try {
    return TonWeb.Address.isValid(address);
  } catch (error) {
    return false;
  }
}

// دالة للحصول على معلومات المعاملة
async function getTransactionInfo(hash) {
  try {
    const info = await tonweb.provider.getTransactions(hash);
    return info;
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المعاملة:', error);
    throw error;
  }
}

module.exports = {
  createWallet,
  getWalletBalance,
  sendTON,
  createTONPaymentLink,
  isValidTONAddress,
  getTransactionInfo
};
