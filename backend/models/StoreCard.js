const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StoreCardSchema = new Schema({
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
  currency: {
    type: String,
    enum: ['SC', 'TON'],
    default: 'SC'
  },
  image: {
    type: String
  },
  category: {
    type: String,
    enum: ['Google Play', 'Steam', 'Amazon', 'iTunes', 'أخرى'],
    default: 'أخرى'
  },
  stock: {
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

module.exports = mongoose.model('StoreCard', StoreCardSchema);
