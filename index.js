// app.js
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/apiRoutes');
const mongodbConfig = require('./config/mongodbConfig');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(mongodbConfig.mongoDB.baseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));