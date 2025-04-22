const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// نموذج مستويات VIP - ميزة إبداعية جديدة
const VIPLevelSchema = new Schema({
  level: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requiredBalance: {
    type: Number,
    required: true
  },
  miningBonus: {
    type: Number,
    default: 0
  },
  referralBonus: {
    type: Number,
    default: 0
  },
  dailyReward: {
    type: Number,
    default: 0
  },
  withdrawalFeeDiscount: {
    type: Number,
    default: 0
  },
  specialPerks: [{
    type: String
  }],
  badgeUrl: {
    type: String
  },
  color: {
    type: String,
    default: '#FFD700' // لون ذهبي افتراضي
  }
}, {
  timestamps: true
});

// دالة للحصول على مستوى VIP بناءً على رصيد المستخدم
VIPLevelSchema.statics.getLevelByBalance = async function(balance) {
  const levels = await this.find().sort({ requiredBalance: -1 });
  
  for (const level of levels) {
    if (balance >= level.requiredBalance) {
      return level;
    }
  }
  
  // إذا لم يتم العثور على مستوى مناسب، أعد المستوى الأدنى
  return await this.findOne().sort({ requiredBalance: 1 });
};

// دالة لحساب المكافأة اليومية بناءً على مستوى VIP
VIPLevelSchema.methods.calculateDailyReward = function(streak) {
  // زيادة المكافأة بناءً على عدد أيام التسجيل المتتالية
  const streakBonus = Math.min(streak * 0.1, 1); // بحد أقصى 100% زيادة
  return this.dailyReward * (1 + streakBonus);
};

module.exports = mongoose.model('VIPLevel', VIPLevelSchema);
