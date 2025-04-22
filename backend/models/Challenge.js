const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// نموذج التحديات الأسبوعية - ميزة إبداعية جديدة
const ChallengeSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['mining', 'referral', 'purchase', 'login', 'transaction'],
    required: true
  },
  target: {
    type: Number,
    required: true
  },
  reward: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    progress: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    rewardClaimed: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// التحقق من اكتمال التحدي للمستخدم
ChallengeSchema.methods.checkCompletion = function(userId, progress) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!participant) {
    return false;
  }
  
  // تحديث التقدم
  participant.progress = progress;
  
  // التحقق من اكتمال التحدي
  if (progress >= this.target && !participant.completed) {
    participant.completed = true;
    participant.completedAt = new Date();
    return true;
  }
  
  return participant.completed;
};

// منح المكافأة للمستخدم
ChallengeSchema.methods.claimReward = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!participant || !participant.completed || participant.rewardClaimed) {
    return false;
  }
  
  participant.rewardClaimed = true;
  return true;
};

module.exports = mongoose.model('Challenge', ChallengeSchema);
