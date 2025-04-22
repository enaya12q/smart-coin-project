const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['تحويل', 'استلام', 'تعدين', 'إحالة', 'شراء', 'بيع'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['معلق', 'مكتمل', 'مرفوض'],
    default: 'مكتمل'
  },
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  toUser: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedPayment: {
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  },
  relatedProduct: {
    type: Schema.Types.ObjectId,
    refPath: 'productModel'
  },
  productModel: {
    type: String,
    enum: ['MiningPackage', 'StoreCard', 'StorePackage']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
