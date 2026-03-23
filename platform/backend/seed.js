/**
 * seed.js — Run once to create the first admin account.
 * Usage: node seed.js
 * 
 * Then delete this file or add it to .gitignore.
 */

require('dotenv').config();
const bcrypt   = require('bcryptjs');
const sequelize = require('./config/database');
const User     = require('./models/User');
const { Portfolio } = require('./models/index');

const ADMIN = {
  name:     'Premier Ufitinema',
  email:    'admin@talentplatform.rw',
  password: 'Admin@123!',     // CHANGE THIS
  role:     'admin',
  country:  'Rwanda',
};

// Sample modules to get started
const SAMPLE_MODULES = [
  {
    title:       'Introduction to JavaScript',
    description: 'Learn the fundamentals of JavaScript — variables, functions, loops, and DOM manipulation.',
    content: `# Introduction to JavaScript

JavaScript is the programming language of the web. It runs in every browser and powers billions of websites.

## Why Learn JavaScript?

- Runs directly in the browser — no installation needed for users
- Used for web, mobile (React Native), and backend (Node.js)
- Huge job market and active community
- Free to learn and use

## Your First Program

Open your browser console (F12) and type:

console.log("Hello, Africa!");

You just wrote JavaScript!

## Variables

Variables store data. In modern JavaScript we use let and const:

let name = "Premier";
const country = "Rwanda";

## Functions

Functions are reusable blocks of code:

function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("Premier"));

## Next Steps

In the next module you will learn about arrays, objects, and how to build interactive web pages.`,
    track:       'Software Development',
    category:    'Fundamentals',
    orderIndex:  1,
    duration:    45,
    tags:        'javascript, beginner, web',
    isPublished: true,
    isOfflineAvailable: true,
  },
  {
    title:       'Building Your First Web Page',
    description: 'Create a complete web page using HTML, CSS, and JavaScript. By the end you will have a live portfolio page.',
    content: `# Building Your First Web Page

A web page is made of three technologies working together:
- HTML — the structure
- CSS — the style
- JavaScript — the behaviour

## HTML Skeleton

Every page starts with this structure:

<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>

## Adding Style with CSS

CSS makes your page look good:

h1 {
  color: blue;
  font-size: 32px;
}

## Making It Interactive

JavaScript adds behaviour:

document.querySelector('h1').addEventListener('click', function() {
  alert('You clicked the heading!');
});

## Your Project

Build a personal portfolio page with:
1. Your name and photo
2. A short bio
3. A list of skills
4. Contact information`,
    track:       'Software Development',
    category:    'Fundamentals',
    orderIndex:  2,
    duration:    60,
    tags:        'html, css, javascript, beginner',
    isPublished: true,
    isOfflineAvailable: true,
  },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✓ Database ready');

    // Create admin
    const existing = await User.findOne({ where: { email: ADMIN.email } });
    if (existing) {
      console.log('Admin already exists:', ADMIN.email);
    } else {
      const hashed = await bcrypt.hash(ADMIN.password, 12);
      const admin  = await User.create({ ...ADMIN, password: hashed, isActive: true, isVerified: true });
      console.log('✓ Admin created:', admin.email);
    }

    // Create sample modules
    const LearningModule = require('./models/LearningModule');
    for (const mod of SAMPLE_MODULES) {
      const exists = await LearningModule.findOne({ where: { title: mod.title } });
      if (!exists) {
        await LearningModule.create(mod);
        console.log('✓ Module created:', mod.title);
      }
    }

    console.log('\n========================================');
    console.log('Seed complete. You can now log in as:');
    console.log('  Email:    ', ADMIN.email);
    console.log('  Password: ', ADMIN.password);
    console.log('  CHANGE THE PASSWORD AFTER FIRST LOGIN!');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
