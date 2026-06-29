const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_interview_lms';

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId       = 'usr_' + Math.random().toString(36).substr(2, 9);

    const newUser = await User.create({
      userId,
      name:          name.trim(),
      email:         normalizedEmail,
      passwordHash,
      completedLessons:        [],
      currentUnlockedLessons:  {
        'frontend-interview-mastery-course': 'lesson_1_1',
        'backend-interview-mastery-course':  'backend_lesson_1_1',
      },
      startedModules: {
        'frontend-interview-mastery-course': ['1'],          // Module 1 auto-started
        'backend-interview-mastery-course':  ['backend_1'],  // Module 1 auto-started
      },
    });

    const token = jwt.sign({ userId: newUser.userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id:                     newUser.userId,
        name:                   newUser.name,
        email:                  newUser.email,
        completedLessons:       newUser.completedLessons,
        currentUnlockedLessons: Object.fromEntries(newUser.currentUnlockedLessons),
      },
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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Ensure module 1 is always auto-started (handles legacy / migrated users)
    const courseIds = ['frontend-interview-mastery-course', 'backend-interview-mastery-course'];
    const mod1Ids   = { 'frontend-interview-mastery-course': '1', 'backend-interview-mastery-course': 'backend_1' };
    let modified = false;

    for (const courseId of courseIds) {
      const started = (user.startedModules && user.startedModules.get
        ? user.startedModules.get(courseId)
        : user.startedModules?.[courseId]) || [];
      if (!started.includes(mod1Ids[courseId])) {
        if (user.startedModules && user.startedModules.set) {
          user.startedModules.set(courseId, [...started, mod1Ids[courseId]]);
        } else {
          if (!user.startedModules) user.startedModules = {};
          user.startedModules[courseId] = [...started, mod1Ids[courseId]];
        }
        modified = true;
      }
    }
    if (modified) {
      user.markModified('startedModules');
      await user.save();
    }

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '7d' });

    const currentUnlockedObj = {};
    if (user.currentUnlockedLessons && user.currentUnlockedLessons.forEach) {
      user.currentUnlockedLessons.forEach((v, k) => { currentUnlockedObj[k] = v; });
    } else {
      Object.assign(currentUnlockedObj, user.currentUnlockedLessons || {});
    }

    res.status(200).json({
      token,
      user: {
        id:                     user.userId,
        name:                   user.name,
        email:                  user.email,
        completedLessons:       user.completedLessons,
        currentUnlockedLessons: currentUnlockedObj,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
}

module.exports = { signup, login };
