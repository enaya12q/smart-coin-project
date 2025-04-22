const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// تعديل نموذج المستخدم لإضافة قيود السحب
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  telegramId: {
    type: String,
    unique: true,
    sparse: true
  },
  telegramUsername: {
    type: String,
    sparse: true
  },
  email: {
    type: String,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    select: false
  },
  avatar: {
    type: String
  },
  balance: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  referralCode: {
    type: String,
    sparse: true,
    unique: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  miningRate: {
    type: Number,
    default: 1
  },
  dailyMiningLimit: {
    type: Number,
    default: 100
  },
  todayMined: {
    type: Number,
    default: 0
  },
  lastMiningTime: {
    type: Date
  },
  miningActive: {
    type: Boolean,
    default: false
  },
  currentPackage: {
    type: Schema.Types.ObjectId,
    ref: 'MiningPackage',
    sparse: true
  },
  packageExpiry: {
    type: Date
  },
  lastDailyReset: {
    type: Date,
    default: Date.now
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  // إضافة حقول جديدة لقيود السحب
  withdrawalLockPeriod: {
    type: Number,
    default: 40 // فترة منع السحب بالأيام (40 يوم)
  },
  withdrawalUnlockDate: {
    type: Date,
    default: function() {
      // تعيين تاريخ فتح السحب بعد 40 يوم من تاريخ التسجيل
      const unlockDate = new Date(this.joinDate);
      unlockDate.setDate(unlockDate.getDate() + this.withdrawalLockPeriod);
      return unlockDate;
    }
  },
  canWithdraw: {
    type: Boolean,
    default: false
  },
  lastWithdrawalCheck: {
    type: Date
  }
}, {
  timestamps: true
});

// إعادة تعيين التعدين اليومي
UserSchema.methods.resetDailyMining = function() {
  const now = new Date();
  const lastReset = this.lastDailyReset;
  
  if (!lastReset || (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear())) {
    this.todayMined = 0;
    this.lastDailyReset = now;
    return true;
  }
  
  return false;
};

// التحقق من انتهاء صلاحية الحزمة
UserSchema.methods.checkPackageExpiry = function() {
  if (this.packageExpiry && new Date() > this.packageExpiry) {
    this.currentPackage = null;
    this.packageExpiry = null;
    this.miningRate = 1;
    this.dailyMiningLimit = 100;
    return true;
  }
  
  return false;
};

// دالة جديدة للتحقق من إمكانية السحب
UserSchema.methods.checkWithdrawalEligibility = function() {
  const now = new Date();
  
  // تحديث تاريخ آخر فحص
  this.lastWithdrawalCheck = now;
  
  // التحقق مما إذا كان قد مر 40 يوم منذ التسجيل
  if (now >= this.withdrawalUnlockDate) {
    this.canWithdraw = true;
    return true;
  }
  
  this.canWithdraw = false;
  return false;
};

// دالة لحساب الوقت المتبقي حتى فتح السحب بالأيام والساعات
UserSchema.methods.getTimeUntilWithdrawal = function() {
  const now = new Date();
  const unlockDate = this.withdrawalUnlockDate;
  
  // إذا كان بالفعل يمكن السحب
  if (now >= unlockDate) {
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
};

module.exports = mongoose.model('User', UserSchema);
