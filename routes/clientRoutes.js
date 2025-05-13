const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

//API Routes
router.get('/payment', (req, res)=>{
    res.render('payment')
})
router.get('/', (req, res) => {
    res.render('home');
});
router.get('/about', (req, res) => {
    res.render('about');
});
router.get('/contact', (req, res) => {
    res.render('contact');
});
router.get('/menu', (req, res) => {
    res.render('menu');
});
router.get('/map', (req, res)=>{
    res.render('map')
})

module.exports = router;
