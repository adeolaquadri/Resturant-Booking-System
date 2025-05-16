const express = require('express');
const mysqlConnection = require('../db/connection');
const router = express.Router();

// Client booking page
router.get('/book', (req, res) => {
  mysqlConnection.query("SELECT * FROM tables WHERE status = ?", ['Available'], (err, rows) => {
    if (err) throw err;
    res.render('book.ejs', { tables: rows, error: '' });
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

router.get('/booking/pricing', async (req, res) => {
  const { bookingType, location } = req.query;

   mysqlConnection.query(
    'SELECT price_per_guest FROM pricing WHERE booking_type = ? AND table_location = ?',
    [bookingType, location], (err, rows)=>{
    if (rows.length === 0) return res.status(404).json({ error: 'Pricing not found' });

    res.json({ price: rows[0].price_per_guest });

    });
});

router.get('table/capacity', async (req, res) => {
  const {table_number, location, capacity,  } = req.query;

   mysqlConnection.query(
    'SELECT capacity FROM tables WHERE table_number = ? AND location = ? AND capacity = ?',
    [table_number, location, capacity], (err, rows)=>{
    if (rows.length === 0) return res.status(404).json({ error: 'Status not found' });

    res.json({ status: rows[0].status });

    });
});

module.exports = router;
