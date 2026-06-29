const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper function to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(payload);
    }
    req.end();
  });
}

// Clean up db.json before running tests so they are reproducible
async function resetDb() {
  const fs = require('fs').promises;
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'data', 'db.json');
  await fs.writeFile(dbPath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  console.log('Database reset complete.');
}

async function runTests() {
  console.log('--- Starting Integration Tests ---');
  await resetDb();

  let token = null;
  let userEmail = `student_${Date.now()}@example.com`;

  // Test 1: Health Check
  console.log('\nTest 1: Health Check...');
  const healthRes = await request('GET', '/status');
  console.log(`Status: ${healthRes.status}, Body:`, healthRes.body);
  if (healthRes.status !== 200 || healthRes.body.status !== 'ok') {
    throw new Error('Health check failed!');
  }

  // Test 2: User Signup
  console.log('\nTest 2: User Signup...');
  const signupRes = await request('POST', '/api/auth/signup', {
    name: 'Test Student',
    email: userEmail,
    password: 'password123'
  });
  console.log(`Status: ${signupRes.status}, Token received: ${!!signupRes.body.token}`);
  if (signupRes.status !== 201 || !signupRes.body.token) {
    throw new Error('Signup failed!');
  }
  token = signupRes.body.token;

  // Test 3: User Login
  console.log('\nTest 3: User Login...');
  const loginRes = await request('POST', '/api/auth/login', {
    email: userEmail,
    password: 'password123'
  });
  console.log(`Status: ${loginRes.status}, Current Unlocked Lesson: ${loginRes.body.user.currentUnlockedLesson}`);
  if (loginRes.status !== 200 || loginRes.body.user.currentUnlockedLesson !== 'lesson_1_1') {
    throw new Error('Login failed!');
  }

  // Test 4: Get Course Structure & Lock Statuses
  console.log('\nTest 4: Get Course Structure...');
  const coursesRes = await request('GET', '/api/courses', null, token);
  console.log(`Status: ${coursesRes.status}, Total Lessons: ${coursesRes.body.lessons.length}`);
  
  const lesson1 = coursesRes.body.lessons.find(l => l.number === '1.1');
  const lesson2 = coursesRes.body.lessons.find(l => l.number === '1.2');
  console.log(`Lesson 1.1: title="${lesson1.title}", isUnlocked=${lesson1.isUnlocked}, isCompleted=${lesson1.isCompleted}`);
  console.log(`Lesson 1.2: title="${lesson2.title}", isUnlocked=${lesson2.isUnlocked}, isCompleted=${lesson2.isCompleted}`);
  
  if (!lesson1.isUnlocked || lesson2.isUnlocked) {
    throw new Error('Progression lock rules violated on dashboard!');
  }

  // Test 5: Fetch Unlocked Lesson 1.1 Details
  console.log('\nTest 5: Fetch Lesson 1.1 Details...');
  const lessonDetailsRes = await request('GET', `/api/courses/lessons/${lesson1.id}`, null, token);
  console.log(`Status: ${lessonDetailsRes.status}, Content Length: ${lessonDetailsRes.body.content ? lessonDetailsRes.body.content.length : 0}`);
  if (lessonDetailsRes.status !== 200 || !lessonDetailsRes.body.content) {
    throw new Error('Failed to fetch unlocked lesson content!');
  }

  console.log('Fetching Lesson 1.1 Questions...');
  const lessonQuestionsRes = await request('GET', `/api/courses/lessons/${lesson1.id}/questions`, null, token);
  console.log(`Status: ${lessonQuestionsRes.status}, Questions count: ${lessonQuestionsRes.body.questions ? lessonQuestionsRes.body.questions.length : 0}`);
  if (lessonQuestionsRes.status !== 200 || !lessonQuestionsRes.body.questions) {
    throw new Error('Failed to fetch unlocked lesson questions!');
  }
  // Verify correctAnswers and explanation fields are stripped for security
  if ('correctAnswers' in lessonQuestionsRes.body.questions[0]) {
    throw new Error('Security violation: correctAnswers leaked in API details response!');
  }
  if ('explanation' in lessonQuestionsRes.body.questions[0]) {
    throw new Error('Security violation: explanation leaked in API details response!');
  }

  // Test 6: Attempt to Fetch Locked Lesson 1.2 Details
  console.log('\nTest 6: Fetch Locked Lesson 1.2 Details (Expecting 403)...');
  const lockedDetailsRes = await request('GET', `/api/courses/lessons/${lesson2.id}`, null, token);
  console.log(`Status: ${lockedDetailsRes.status}, Message: ${lockedDetailsRes.body.message}`);
  if (lockedDetailsRes.status !== 403) {
    throw new Error('Access control failed: was able to fetch locked lesson details!');
  }

  // Test 7: Fail Quiz Submission for Lesson 1.1
  console.log('\nTest 7: Fail Quiz Submission...');
  // Q1 correct is 1 (index), Q2 is [0, 1, 2], Q3 is 'var'
  const failSubmitRes = await request('POST', `/api/courses/lessons/${lesson1.id}/submit`, {
    answers: {
      "q1_1_1": 0, // incorrect
      "q1_1_2": [0], // incorrect
      "q1_1_3": "wrong answer"
    }
  }, token);
  console.log(`Status: ${failSubmitRes.status}, Passed: ${failSubmitRes.body.passed}, Message: ${failSubmitRes.body.message}`);
  if (failSubmitRes.status !== 200 || failSubmitRes.body.passed === true) {
    throw new Error('Quiz grading failed: incorrect answers marked as passed!');
  }

  // Test 8: Pass Quiz Submission for Lesson 1.1
  console.log('\nTest 8: Pass Quiz Submission...');
  const passSubmitRes = await request('POST', `/api/courses/lessons/${lesson1.id}/submit`, {
    answers: {
      "q1_1_1": 1, // Block Scope
      "q1_1_2": [0, 1, 2], // 3 options correct
      "q1_1_3": "var" // var keyword
    }
  }, token);
  console.log(`Status: ${passSubmitRes.status}, Passed: ${passSubmitRes.body.passed}, Next Lesson Unlocked: ${passSubmitRes.body.nextLessonId}`);
  if (passSubmitRes.status !== 200 || passSubmitRes.body.passed !== true || passSubmitRes.body.nextLessonId !== lesson2.id) {
    throw new Error('Quiz grading failed: correct answers did not unlock next lesson!');
  }

  // Test 9: Verify Lesson 1.2 is now Unlocked on Course List
  console.log('\nTest 9: Verify Lock Progress in Courses List...');
  const coursesPostRes = await request('GET', '/api/courses', null, token);
  const updatedLesson1 = coursesPostRes.body.lessons.find(l => l.number === '1.1');
  const updatedLesson2 = coursesPostRes.body.lessons.find(l => l.number === '1.2');
  console.log(`Lesson 1.1: isUnlocked=${updatedLesson1.isUnlocked}, isCompleted=${updatedLesson1.isCompleted}`);
  console.log(`Lesson 1.2: isUnlocked=${updatedLesson2.isUnlocked}, isCompleted=${updatedLesson2.isCompleted}`);
  if (!updatedLesson1.isCompleted || !updatedLesson2.isUnlocked) {
    throw new Error('Progress state not saved or next lesson failed to unlock!');
  }

  // Test 10: Verify Lesson 1.2 Details are now accessible
  console.log('\nTest 10: Fetch Previously Locked Lesson 1.2 details...');
  const accessDetailsRes = await request('GET', `/api/courses/lessons/${lesson2.id}`, null, token);
  console.log(`Status: ${accessDetailsRes.status}, Title: ${accessDetailsRes.body.title}`);
  if (accessDetailsRes.status !== 200 || !accessDetailsRes.body.content) {
    throw new Error('Failed to access unlocked lesson details!');
  }

  console.log('\n--- All Integration Tests Completed Successfully! ---');
}

// Since server is started asynchronously, let's wait 1 second before running tests
setTimeout(() => {
  runTests().catch(err => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
  });
}, 1000);
