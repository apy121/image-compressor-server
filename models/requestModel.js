// models/requestModel.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
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

const Request = mongoose.model("Request", requestSchema)
module.exports = Request;