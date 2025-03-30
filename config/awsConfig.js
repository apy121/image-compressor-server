require("dotenv").config();
// cloudinaryConfig.js
module.exports = {
  aws: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_Key: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  },
};
