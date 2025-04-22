const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// نموذج توقعات سعر العملة - ميزة إبداعية جديدة
const PricePredictionSchema = new Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  initialPrice: {
    type: Number,
    required: true
  },
  finalPrice: {
    type: Number
  },
  status: {
    type: String,
    enum: ['جاري', 'مكتمل'],
    default: 'جاري'
  },
  predictions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    direction: {
      type: String,
      enum: ['ارتفاع', 'انخفاض'],
      required: true
    },
    predictedAt: {
      type: Date,
      default: Date.now
    },
    isCorrect: {
      type: Boolean
    },
    rewardClaimed: {
      type: Boolean,
      default: false
    }
  }],
  reward: {
    type: Number,
    default: 50 // المكافأة الافتراضية للتوقع الصحيح
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// دالة لإضافة توقع جديد
PricePredictionSchema.methods.addPrediction = function(userId, direction) {
  // التحقق من عدم وجود توقع سابق لهذا المستخدم
  const existingPrediction = this.predictions.find(p => p.user.toString() === userId.toString());
  
  if (existingPrediction) {
    return false;
  }
  
  // التحقق من أن التوقع لا يزال مفتوحاً
  if (new Date() >= this.endDate || this.status === 'مكتمل') {
    return false;
  }
  
  // إضافة التوقع الجديد
  this.predictions.push({
    user: userId,
    direction: direction,
    predictedAt: new Date()
  });
  
  return true;
};

// دالة لإنهاء التوقع وتحديد الفائزين
PricePredictionSchema.methods.finalizePrediction = function(finalPrice) {
  if (this.status === 'مكتمل') {
    return false;
  }
  
  this.finalPrice = finalPrice;
  this.status = 'مكتمل';
  
  // تحديد الاتجاه الصحيح
  const correctDirection = finalPrice > this.initialPrice ? 'ارتفاع' : 'انخفاض';
  
  // تحديث حالة التوقعات
  this.predictions.forEach(prediction => {
    prediction.isCorrect = prediction.direction === correctDirection;
  });
  
  return true;
};

// دالة للحصول على عدد التوقعات الصحيحة
PricePredictionSchema.methods.getCorrectPredictionsCount = function() {
  return this.predictions.filter(p => p.isCorrect).length;
};

module.exports = mongoose.model('PricePrediction', PricePredictionSchema);
