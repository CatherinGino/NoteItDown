const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Production security middleware
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));

// MongoDB Atlas connection
console.log('Connecting to MongoDB Atlas...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('Database:', mongoose.connection.name);
  })
  .catch((error) => {
    console.error('❌ MongoDB Atlas connection error:', error.message);
    console.log('Please check:');
    console.log('1. Your IP address is whitelisted in MongoDB Atlas Network Access');
    console.log('2. Your MongoDB credentials are correct');
    console.log('3. Your internet connection is stable');
    console.log('4. The cluster is running and accessible');
    process.exit(1);
  });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB Atlas');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  theme: { type: String, default: 'light' },
  profileImage: { type: String, default: null }, // Base64 encoded image or URL
  createdAt: { type: Date, default: Date.now }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' }, // Allow empty content
  color: { type: String, default: '#fff3cd' },
  size: { type: String, default: 'medium' },
  position: { x: Number, y: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('Environment check - JWT_SECRET exists:', !!process.env.JWT_SECRET);

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    console.log('User created successfully:', user._id);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, username, email, theme: user.theme, profileImage: user.profileImage } });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    console.log('MongoDB connection state:', mongoose.connection.readyState);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    console.log('User found:', !!user);

    if (!user || !await bcrypt.compare(password, user.password)) {
      console.log('Invalid credentials for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login successful for user:', user._id);
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user._id, username: user.username, email, theme: user.theme, profileImage: user.profileImage } });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.userId });
    res.json(notes);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    console.log('Creating note for user:', req.user.userId);
    console.log('Note data:', req.body);

    const note = new Note({ ...req.body, userId: req.user.userId });
    await note.save();

    console.log('Note created successfully:', note._id);
    res.json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/user/theme', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { theme: req.body.theme },
      { new: true }
    );
    res.json({ theme: user.theme });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/user/profile-image', authenticateToken, async (req, res) => {
  try {
    console.log('Profile image update request received');
    const { profileImage } = req.body;

    // Basic validation for base64 image
    if (profileImage && !profileImage.startsWith('data:image/')) {
      console.log('Invalid image format:', profileImage?.substring(0, 50));
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Check image size (base64 is ~33% larger than original)
    if (profileImage && profileImage.length > 3 * 1024 * 1024) { // ~2MB original
      console.log('Image too large:', profileImage.length);
      return res.status(400).json({ error: 'Image too large' });
    }

    console.log('Updating user profile image for user:', req.user.userId);
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profileImage },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Profile image updated successfully');
    res.json({ profileImage: user.profileImage });
  } catch (error) {
    console.error('Profile image update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/user/username', authenticateToken, async (req, res) => {
  try {
    console.log('Username update request received');
    const { username } = req.body;

    // Validate username
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (username.trim().length > 20) {
      return res.status(400).json({ error: 'Username must be less than 20 characters' });
    }

    // Check if username already exists (excluding current user)
    const existingUser = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user.userId }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    console.log('Updating username for user:', req.user.userId);
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username: username.trim() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Username updated successfully to:', username.trim());
    res.json({
      username: user.username,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        theme: user.theme,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Username update error:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});