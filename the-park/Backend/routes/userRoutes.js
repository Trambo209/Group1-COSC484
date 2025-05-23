const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const path = require('path');


router.post('/register', upload.single('profilePic'), async (req, res) => {
  console.log('Hit /register route'); // checks route
  try {
    const { username, profilename, email, password, bio } = req.body;
    let profilePic = null;
    if (req.file) {
      console.log('Uploaded original filename:', req.file.originalname);
      const ext = path.extname(req.file.originalname);
      const newFilename = req.file.filename + ext;
      const newPath = path.join(__dirname, '..', 'uploads', newFilename);
      fs.renameSync(req.file.path, newPath);
      profilePic = `uploads/${newFilename}`;
    }


    if (!username || !profilename || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
    return res.status(400).json({ error: 'Username is already taken.' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
    return res.status(400).json({ error: 'Email is already taken.' });
  }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ username, profilename, email, password: hashedPassword, bio, profilePic });
    await newUser.save();

    res.status(201).json({ message: 'User created.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error!' });
  }
});

router.post('/login', async (req, res) => {
  console.log('Hit /login route'); // checks route
  try {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email and/or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect Password, Try again.' });
    }

    const payload = { userId: user._id};
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful!', data: { token, user: { id: user._id, username: user.username }}});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error!' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('groupsOwned', 'groupName')
      .populate('groupsJoined', 'groupName');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      username: user.username,
      profilename: user.profilename,
      email: user.email,
      bio: user.bio,
      profilePic: user.profilePic,
      posts: user.posts,
      groupsOwned: user.groupsOwned,
      groupsJoined: user.groupsJoined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching profile data' });
  }
});

module.exports = router;