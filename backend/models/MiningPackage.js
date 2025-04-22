const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MiningPackageSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  miningRate: {
    type: Number,
    required: true
  },
  dailyLimit: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 30 // بالأيام
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MiningPackage', MiningPackageSchema);
