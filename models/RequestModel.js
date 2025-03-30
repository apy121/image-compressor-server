// models/requestModel.js
const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  requestId: String,
  status: { type: String, default: 'pending' },
  products: [
    {
      serialNumber: Number,
      productName: String,
      inputImageUrls: [String],
      outputImageUrls: [String],
    },
  ],
  webhookUrl: String,
});

module.exports = mongoose.model('Request', RequestSchema);