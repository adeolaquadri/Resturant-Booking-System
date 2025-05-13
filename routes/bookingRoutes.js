const express = require('express');
const mysqlConnection = require('../db/connection');
const router = express.Router();

// Client booking page
router.get('/book', (req, res) => {
  mysqlConnection.query("SELECT * FROM tables WHERE status = 'available'", (err, rows) => {
    if (err) throw err;

    mysqlConnection.query('SELECT * FROM menu', (err, menu) => {
      if (err) throw err;

      res.render('book.ejs', { tables: rows, menu: menu, error: '' });
    });
  });
});

// New booking submission
router.post('/new_booking', (req, res) => {
  const { fname, lname, email, phone, bookType, guests, reference, location, date, time, until } = req.body;
  const bookingid = 'tsk' + Date.now().toString(10);
  const booking_status = 'Pending';

  let query = 'INSERT INTO booking (id, fname, lname, email, phone, bookType, location, date, time, until, status, reference, guests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  mysqlConnection.query(query, [bookingid, fname, lname, email, phone, bookType, location, date, time, until, booking_status, reference, guests], (err) => {
    if (err) throw err;

    res.send(`
      <html>
        <head><title>Booking Successful</title></head>
        <body>
          <h1>You have successfully added a new booking</h1>
          <p>You will be redirected back to the dashboard in 5 seconds...</p>
          <script>
            setTimeout(function() {
              window.location.href = '/admin/dashboard'; 
            }, 5000);
          </script>
        </body>
      </html>
    `);
  });
});

module.exports = router;
