const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['TON', 'USDT'],
    default: 'TON'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  paymentUrl: {
    type: String
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  walletAddress: {
    type: String
  },
  verificationCount: {
    type: Number,
    default: 0
  },
  lastVerificationTime: {
    type: Date
  },
  relatedProduct: {
    type: Schema.Types.ObjectId,
    refPath: 'productModel'
  },
  productModel: {
    type: String,
    enum: ['MiningPackage', 'StoreCard', 'StorePackage']
  },
  expiresAt: {
    type: Date,
    default: function() {
      // تنتهي صلاحية الدفع بعد ساعة واحدة
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  },
  securityHash: {
    type: String
  },
  ipAddress: {
    type: String
  },
  deviceInfo: {
    type: String
  },
  fraudScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// التحقق من انتهاء صلاحية الدفع
PaymentSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// إنشاء رابط دفع جديد
PaymentSchema.methods.generatePaymentUrl = function(baseUrl) {
  return `${baseUrl}/pay/${this.transactionId}`;
};

// حساب درجة الاحتيال
PaymentSchema.methods.calculateFraudScore = function() {
  let score = 0;
  
  // زيادة الدرجة إذا كان هناك محاولات تحقق متكررة
  if (this.verificationCount > 5) {
    score += 10;
  }
  
  // زيادة الدرجة إذا كان المبلغ كبيرًا جدًا
  if (this.amount > 100) {
    score += 5;
  }
  
  // تحديث درجة الاحتيال
  this.fraudScore = score;
  
  return score;
};

module.exports = mongoose.model('Payment', PaymentSchema);
