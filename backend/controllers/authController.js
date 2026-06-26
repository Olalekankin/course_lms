const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDb, writeDb } = require('../utils/dbHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_interview_lms';

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const db = await readDb();
    const normalizedEmail = email.toLowerCase().trim();
    const userExists = db.users.find(u => u.email === normalizedEmail);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      completedLessons: [],
      currentUnlockedLesson: 'lesson_1_1',
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    await writeDb(db);
    
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        completedLessons: newUser.completedLessons,
        currentUnlockedLesson: newUser.currentUnlockedLesson
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error during signup' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const db = await readDb();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users.find(u => u.email === normalizedEmail);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        completedLessons: user.completedLessons,
        currentUnlockedLesson: user.currentUnlockedLesson
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
}

module.exports = {
  signup,
  login
};
