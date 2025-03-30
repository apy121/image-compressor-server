require("dotenv").config();

// mongodbConfig.js
module.exports = {
  mongoDB: {
    baseUrl: process.env.MONGO_DB_BASE_URL,
  },
};
