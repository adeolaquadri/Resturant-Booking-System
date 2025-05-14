const express = require('express');
const axios = require('axios');
const mysqlConnection = require('../db/connection');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Payment Route
router.post("/pay", async (req, res) => {
  try {
    const { email, amount, lname, fname, bookType, location, phone, guests, date, time, until} = req.body;
    console.log(email, fname, amount, phone);
    const bookingid = {id:'tsk'+Date.now().toString(10)}
    const booking_status = 'Pending'

    if (!email || !amount) {
      return res.status(400).json({ error: "Email and amount are required" });
    }
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo
        metadata: { fname, phone },
        currency: "NGN",
        callback_url: "http://localhost:4000/verify",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if(response.data.status){
        const reference = response.data.data.reference;
    let query = 'INSERT INTO booking VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    mysqlConnection.query(query, [bookingid.id, fname, lname, email, phone, bookType, location, date, time, until, booking_status, reference, guests],(err) => {           
    if (err) {
        console.error(err)
    }
    })
      }
res.json({ authorization_url: response.data.data.authorization_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});
// Payment Verification
router.get("/verify", async (req, res) => {
  try {
    const { reference } = req.query;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.data.status === "success") {
      mysqlConnection.query(`UPDATE booking SET status = 'Approved' WHERE reference = ?`, [reference], (err) => {
        if (err) throw err;
      });

      res.send(`
        <html>
          <body>
            <h2>Your payment with reference ${reference} is successful!</h2>
            <p>You will be redirected to the booking page in 10 seconds...</p>
            <script>
              setTimeout(function() {
                window.location.href = '/booking/book';
              }, 10000);
            </script>
          </body>
        </html>
      `);
    } else {
      mysqlConnection.query(`UPDATE booking SET status = 'Canceled' WHERE reference = ?`, [reference], (err) => {
        if (err) throw err;
      });

      res.status(400).send("Payment Failed");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

module.exports = router;
