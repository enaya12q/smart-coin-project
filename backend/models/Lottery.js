const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// نموذج السحوبات العشوائية - ميزة إبداعية جديدة
const LotterySchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  prize: {
    type: String,
    required: true
  },
  prizeValue: {
    type: Number,
    required: true
  },
  prizeImage: {
    type: String
  },
  ticketPrice: {
    type: Number,
    default: 0 // 0 يعني مجاني للمستخدمين المؤهلين
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  drawDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['قادم', 'جاري', 'مكتمل', 'ملغي'],
    default: 'قادم'
  },
  eligibilityCriteria: {
    minBalance: {
      type: Number,
      default: 0
    },
    minLevel: {
      type: Number,
      default: 1
    },
    requiresActivity: {
      type: Boolean,
      default: false
    }
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    tickets: {
      type: Number,
      default: 1
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  winner: {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ticketNumber: {
      type: Number
    },
    announcedAt: {
      type: Date
    },
    claimed: {
      type: Boolean,
      default: false
    }
  },
  totalTickets: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// دالة لإضافة مشارك جديد
LotterySchema.methods.addParticipant = function(userId, tickets = 1) {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (existingParticipant) {
    existingParticipant.tickets += tickets;
  } else {
    this.participants.push({
      user: userId,
      tickets: tickets,
      joinedAt: new Date()
    });
  }
  
  this.totalTickets += tickets;
  return true;
};

// دالة لاختيار الفائز عشوائياً
LotterySchema.methods.drawWinner = function() {
  if (this.participants.length === 0) {
    return null;
  }
  
  // إنشاء مصفوفة من جميع التذاكر
  const tickets = [];
  this.participants.forEach(participant => {
    for (let i = 0; i < participant.tickets; i++) {
      tickets.push(participant.user);
    }
  });
  
  // اختيار تذكرة عشوائية
  const randomIndex = Math.floor(Math.random() * tickets.length);
  const winningTicket = tickets[randomIndex];
  const winningTicketNumber = randomIndex + 1;
  
  // تعيين الفائز
  this.winner = {
    user: winningTicket,
    ticketNumber: winningTicketNumber,
    announcedAt: new Date(),
    claimed: false
  };
  
  this.status = 'مكتمل';
  
  return this.winner;
};

module.exports = mongoose.model('Lottery', LotterySchema);
