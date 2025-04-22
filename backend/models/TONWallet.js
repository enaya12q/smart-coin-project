const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// نموذج محفظة TON
const TONWalletSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true,
    unique: true
  },
  publicKey: {
    type: String,
    required: true
  },
  // لا نخزن المفتاح الخاص في قاعدة البيانات للأمان
  // يتم تسليمه للمستخدم فقط عند إنشاء المحفظة
  encryptedSeedPhrase: {
    type: String,
    select: false // لا يتم استرجاعه في الاستعلامات العادية
  },
  balance: {
    type: Number,
    default: 0
  },
  lastBalanceUpdate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  externalWalletLinked: {
    type: Boolean,
    default: false
  },
  externalWalletType: {
    type: String,
    enum: ['tonkeeper', 'tonhub', 'other'],
    sparse: true
  },
  externalWalletAddress: {
    type: String,
    sparse: true
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
}, {
  timestamps: true
});

// دالة لتحديث رصيد المحفظة
TONWalletSchema.methods.updateBalance = async function(tonWalletService) {
  try {
    const balance = await tonWalletService.getWalletBalance(this.address);
    this.balance = balance;
    this.lastBalanceUpdate = new Date();
    await this.save();
    return balance;
  } catch (error) {
    console.error('خطأ في تحديث رصيد المحفظة:', error);
    throw error;
  }
};

// دالة لإنشاء رابط دفع
TONWalletSchema.methods.createPaymentLink = function(amount, comment, tonWalletService) {
  try {
    return tonWalletService.createTONPaymentLink(this.address, amount, comment);
  } catch (error) {
    console.error('خطأ في إنشاء رابط دفع:', error);
    throw error;
  }
};

// دالة لربط محفظة خارجية
TONWalletSchema.methods.linkExternalWallet = async function(externalAddress, walletType) {
  try {
    this.externalWalletLinked = true;
    this.externalWalletType = walletType;
    this.externalWalletAddress = externalAddress;
    await this.save();
    return true;
  } catch (error) {
    console.error('خطأ في ربط المحفظة الخارجية:', error);
    throw error;
  }
};

// دالة لإلغاء ربط المحفظة الخارجية
TONWalletSchema.methods.unlinkExternalWallet = async function() {
  try {
    this.externalWalletLinked = false;
    this.externalWalletType = undefined;
    this.externalWalletAddress = undefined;
    await this.save();
    return true;
  } catch (error) {
    console.error('خطأ في إلغاء ربط المحفظة الخارجية:', error);
    throw error;
  }
};

module.exports = mongoose.model('TONWallet', TONWalletSchema);
