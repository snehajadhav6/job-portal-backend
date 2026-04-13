const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();


app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const companyRoutes = require('./routes/company.routes');
const jobRoutes = require('./routes/job.routes');
const applicationRoutes = require('./routes/application.routes');
const userRoutes = require('./routes/user.routes');
const resumeRoutes = require('./routes/resumeRoutes');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/company', companyRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', applicationRoutes);
app.use('/users', userRoutes);
app.use('/api/resume', resumeRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Job Platform API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});