const express = require('express');
const mysqlConnection = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { route } = require('./bookingRoutes');
const router = express.Router();

// Admin login
router.get('/login', (req, res) => {
  res.render('adminlog');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  mysqlConnection.query('SELECT * FROM admin WHERE email = ?', [email], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(401).json({ message: 'Access Denied!' });
    }

    const isMatch = await bcrypt.compare(password, result[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Access Denied!' });
    }

    const token = jwt.sign({ email }, process.env.secret_key, { expiresIn: '1h' });
    res.cookie('jwt', token, { httpOnly: true, maxAge: 3600000 }); // 1 hour expiry
    res.redirect('/admin/dashboard');
  });
});

// Admin dashboard
router.get('/dashboard', (req, res) => {
  if (req.cookies.jwt) {
    const identity = jwt.verify(req.cookies.jwt, process.env.secret_key);
    mysqlConnection.query('SELECT * FROM admin WHERE email = ?', [identity.email], (err, admin) => {
      if (err) throw err;
    mysqlConnection.query('SELECT * FROM booking WHERE status = ?', ["Pending"], (err, pending)=>{
      if (err) throw err;
    mysqlConnection.query('SELECT * FROM booking WHERE status = ?', ["Approved"], (err, approved)=>{
      if (err) throw err;
    mysqlConnection.query('SELECT * FROM booking WHERE status = ?', ["Canceled"], (err, canceled)=>{
      if (err) throw err;
     mysqlConnection.query('SELECT * FROM booking', (err, bookings)=>{
      if (err) throw err;
      res.render('admindashboard', {
        admin: admin[0],
        email: identity.email,
        bookings: bookings,
        pending: pending,
        approved: approved,
        canceled: canceled
      });
    });
  });
});
    });
  });
  } else {
    res.redirect('/admin/login');
  }
});

router.get('/admin', (req, res)=>{
   mysqlConnection.query('select * from admin', (err, row)=>{
   if(err) return res.status(500).json({message: err.message})
   return res.status(200).json({admin:row})
})
})

// Admin logout
router.get('/logout', (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/admin/login');
});

module.exports = router;
