//Import dependencies
const express = require('express')
const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const ejs = require('ejs')
const cookieParser = require('cookie-parser')


const server = express()
const app = express();

//declaring the port for viewing
const port = 3000

//Creating connection with mysql database
const sqlConnection = mysql.createConnection({
    user: 'Tomi',
    host: 'localhost',
    port: 3306,
    password: 'testimony1234',
    database: 'restaurant'
});

sqlConnection.connect((err) => {
    if (err) throw err;
    console.log('Database Connected Successfully');
});


//Middleware
app.use(express.static('public'))
// To parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({extended: false}))
app.use (cookieParser())


app.set('view engine', 'ejs');
//API Routes
app.use('/home', (req, res) => {
    res.render('home');
});
app.use('/about', (req, res) => {
    res.render('about');
});
app.use('/contact', (req, res) => {
    res.render('contact');
});
app.use('/menu', (req, res) => {
    res.render('menu');
});
app.use('/admin/dashboard/profile', (req, res) => {
    res.render('adminprofile');
});
app.use('/map', (req, res) => {
    res.render('map');
});
app.get('/book', (req, res)=>{
    res.render('book.ejs', {error: ""})
  })
  app.get('/admin/login', (req, res) => {
    res.render('adminlog');
});
app.get('/admin/dashboard', (req,res)=>{
    if(req.cookies.jwt){
        const verify = jwt.verify(req.cookies.jwt, 
            'hsjjdhh56hnndfmdnfnnm64sjchfsjkndsjsudhweejfcsjkudf8schhguscjg')
            res.render('admindashboard.ejs',{username:verify.username})
    }
    else{
        res.redirect('/admin/login')
    }
})
app.get('/admin/dashboard/new_booking', (req,res)=>{
    if(req.cookies.jwt){
        const verify = jwt.verify(req.cookies.jwt,'hsjjdhh56hnndfmdnfnnm64sjchfsjkndsjsudhweejfcsjkudf8schhguscjg')
        res.render("newbooking.ejs", {message: ""})
    }else{
        res.redirect('/admin/dashboard')
    }
})
app.get('/logout', (req, res)=>{
    res.cookie("jwt", "", {maxAge: 1})
    res.redirect('/admin/login')
  })

 // Send data from frontend to backend using post method
app.post('/book', async (req, res) => {
    try {
        const { fname, lname, phone, email, bookType, location, numPeople, date, time, until } = req.body // Destructure req.body
        const bookingid = {id:Date.now().toString(10)}

        sqlConnection.query('INSERT INTO data_base (First_Name, Last_Name, Phone_Number, Email, Booking_Type, Table_Location, Number_of_People, _Date, _Time, _Until, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [fname, lname, phone, email, bookType, location, numPeople, date, time, until, bookingid.id],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error inserting data');
                }
            // Sending HTML response with JavaScript to reload
        res.send(`
            <html>
                <head>
                    <title>Booking Successful</title>
                    <script>
                        setTimeout(function() {
                        // Change to your actual booking page URL
                                    window.location.href = '/book'; 
                                }, 15000); // 15 seconds
                    </script>
                </head>
                <body>
                    <h1>Congratulations ${lname}, you have successfully booked a table.</h1>
                    <h3>Your Booking-ID is ${bookingid.id}</h3>
                      <p>You will be redirected back to the booking page in 15 seconds...</p>
                </body>
            </html>
              `);
            }
        );
    } catch (e) {
        console.error(e);
         // Handle unexpected errors
        return res.status(500).send('Internal Server Error');
    }
});

//Admin Login Authentication
app.post('/admin/login', (req, res)=>{
    const user ={
        username: "Testimony",
        password: "1234wer567yui"
    }
    const token = jwt.sign({username: user.username}, 'hsjjdhh56hnndfmdnfnnm64sjchfsjkndsjsudhweejfcsjkudf8schhguscjg')
    res.cookie('jwt', token,{
        maxAge: 600000,
        httpOnly: true
    })
    const databaseConnection = mysql.createConnection({
        user: req.body.username,
        password: req.body.password,
        database: 'restaurant',
        host: 'localhost',
        port: 3306
    })
    databaseConnection.connect((err)=>{
        if(err){
            // console.log(err) 
            // const error = "Access Denied!!!"
            // res.render("adminlog.ejs", {error})

            res.send(`
                <html>
                    <head>
                        <title>Access Denied</title>
                            <link rel="icon" href="/images/access denied.jpeg">
                        <script>
                            setTimeout(function() {
                                window.location.href = '/admin/login'; 
                            }, 5000); // 5 seconds
                        </script>
                    </head>
                    <body>
                        <h1>Access Denied!!!</h1>
                        <p>You will be redirected back to the login page in 5 seconds...</p>
                    </body>
                </html>
            `);
        }
        else{
            res.cookie('jwt', token,{
                maxAge: 600000,
                httpOnly: true
            })
            res.redirect('/admin/dashboard')
        }
    })
})

//Add new booking
app.post('/new_booking', (req, res) => {
    const databaseConnection = mysql.createConnection({
        user: "Testimony",
        password: "1234wer567yui",
        database: 'restaurant',
        host: 'localhost',
        port: 3306
    });

    // Connect to the database
    databaseConnection.connect((err) => {
        if (err) {
            console.error('Database connection error:', err);
            return res.status(500).send('Error connecting to the database');
        }

        // Destructure req.body
        const { fname, lname, phone, email, bookType, location, numPeople, date, time, until } = req.body;
        const bookingid = { id: Date.now().toString(10) };

        // Prepare and execute the query
        databaseConnection.query(
            'INSERT INTO data_base (First_Name, Last_Name, Phone_Number, Email, Booking_Type, Table_Location, Number_of_People, _Date, _Time, _Until, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [fname, lname, phone, email, bookType, location, numPeople, date, time, until, bookingid.id],
            (err) => {
                // Handle query error
                if (err) {
                    console.error('Query execution error:', err);
                    return res.status(500).send('Error inserting data');
                }

                // Send success response
                res.send(`
                    <html>
                        <head>
                            <title>Booking Successful</title>
                            <link rel="icon" href="/images/logo-removebg-preview.png">
                            <script>
                                setTimeout(function() {
                                    window.location.href = '/admin/dashboard'; 
                                }, 5000); // 5 seconds
                            </script>
                        </head>
                        <body>
                            <h1>Congratulations, you have successfully added a new booking</h1>
                            <p>You will be redirected back to the admin page in 5 seconds...</p>
                        </body>
                    </html>
                `);
            }
        );

        // Close the database connection after the query
        databaseConnection.end();
    });
});

    //Retrieve all booking records
app.get('/admin/dashboard/booking',(req, res)=>{
    const databaseConnection = mysql.createConnection({
        user: "Testimony",
        password: "1234wer567yui",
        database: 'restaurant',
        host: 'localhost',
        port: 3306
    })	
    databaseConnection.connect((err)=>{
      if(!err){
        databaseConnection.query('select * from data_base', (err, result)=>{
        if(err) throw err
        res.json(result)
       })
      }
    })
  
  });
  
app.listen(port, () => console.log(`Server is listening on port ${port}`));
