// //Import dependencies
const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const ejs = require('ejs')
const cookieParser = require('cookie-parser')
const Paystack = require('paystack')
const axios = require('axios')
const cors = require('cors')
const bcrypt = require('bcryptjs')
dotenv.config()

//Server setup
const app = express()
//Middleware
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({extended: false}))
app.use (cookieParser())
app.use(cors())

//Database Connection
const mysqlConnection = mysql.createConnection({
    user: 'root',
    password: 'root111',
    database:'Tomi_Kitchen',
    host:'localhost',
    port:3307
})

mysqlConnection.connect((err)=>{
    if(err){
        console.log(err)
    }else{
        console.log("database connected!")
    }
})


// Paystack Secret Key
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Payment Route
app.post("/pay", async (req, res) => {
  try {
    const { email, lname, fname, amount, bookType, location, phone, guests, date, time, until} = req.body;
    console.log(email, fname, amount, phone)
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

// Verify Payment
app.get("/verify", async (req, res) => {
  try {
    const { reference } = req.query;
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
  });
  if (response.data.data.status === "success") {
    mysqlConnection.query(`UPDATE booking SET status = 'Approved' where reference = '${reference}'`, (err) => {
        if (err) {
            console.error(err)
        }
   })
    return res.send(`<html>
        <body>
        <head>
        <title>Payment Successful</title>
        </head>
        <h2>Your payment with reference <i>${reference}</i> is successful!</h2>
        <p>You will be redirected to the booking page in 10 sec</p>
        <script>
        setTimeout(function(){
        window.location.href = '/book'
        },10000)
        </script>
        </body>
        </html>`);
  }else{
    mysqlConnection.query(`UPDATE booking SET status = 'Canceled' where reference = '${reference}'`, (err) => {
        if (err) {
         console.error(err)
        }
   })
    return res.status(400).send("Payment Failed");
  }
} catch (error) {
  res.status(500).json({ error: "Payment verification failed" });
}
});
app.set('view engine', 'ejs');
//API Routes
app.get('/payment', (req, res)=>{
    res.render('payment')
})
app.get('/', (req, res) => {
    res.render('home');
});
app.get('/about', (req, res) => {
    res.render('about');
});
app.get('/contact', (req, res) => {
    res.render('contact');
});
app.get('/menu', (req, res) => {
    res.render('menu');
});

//GET: Admin Profile Route
app.get('/admin/profile', (req, res) => {
    if(req.cookies.jwt){
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query(`select * from admin where username = '${identity.username}'`, (err, admin)=>{
            if(err) throw err
        res.render('adminprofile',{
            admin:admin,
            image:admin[0].profile_picture,
            username:identity.username
        })
    })
    }
});

//GET: Map route
app.get('/map', (req, res) => {
    res.render('map');
});

//GET: Client booking page
app.get('/book', (req, res)=>{
    mysqlConnection.query(`select * from tables where status = 'available'`, (err, rows)=>{
        if(err) throw err
    mysqlConnection.query(`select * from menu`, (err, menu)=>{
        if(err) throw err
    res.render('book.ejs', {tables:rows, error: "", menu:menu})
  })
})
})

//GET: Admin login route
app.get('/admin/login', (req, res) => {
    res.render('adminlog');
});

//GET: Admin Dashboard
app.get('/admin/dashboard', (req,res)=>{
    if(req.cookies.jwt){
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query(`select * from admin where email = '${identity.email}'`, (err, result)=>{
            if(err) throw err
        mysqlConnection.query(`select * from booking`, (err, bookings)=>{
            if(err) throw err
        mysqlConnection.query(`select * from booking where status = 'pending'`, (err, pending)=>{
            if(err) throw err
        mysqlConnection.query(`select * from booking where status = 'approved'`, (err, approved)=>{
            if(err) throw err
        mysqlConnection.query(`select * from booking where status = 'canceled'`, (err, cancel)=>{
            if(err) throw err
            res.render('admindashboard.ejs',
                {
                email:identity.email,
                image:result[0].profile_picture,
                pending:pending,
                cancel:cancel,
                approved:approved,
                bookings:bookings
            })
        })
    })
    })
})
    })
    }else{
        res.redirect('/admin/login')
    }
})
//GET: Admin add new booking
app.get('/admin/new_booking', (req,res)=>{
    if(req.cookies.jwt){
        const verify = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query(`select * from tables where status = 'available'`, (err, tables)=>{
            if(err) throw err
        mysqlConnection.query(`select * from menu`, (err, menu)=>{
        res.render("newbooking.ejs", {message: "", tables:tables, menu:menu})
        })
        })
    }else{
        res.redirect('/admin/dashboard')
    }
})
//GET:Admin change password route
app.get('/admin/change_password', (req ,res)=>{
    if(req.cookies.jwt){
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query(`select * from admin where username = '${identity.username}'`, (err, admin)=>{
        res.render('change_password', {image:admin[0].profile_picture, username:identity.username})
        })
    }else{
        res.redirect('/admin/login')
    }
})
//POST: Admin change password
app.post('/admin/change_password', (req, res)=>{
    try{
        if(req.cookies.jwt){
        const verify = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query('select password from admin where username = ?',[verify.username], async(err, result)=>{
                if(err) throw err
                if(result.length==1){
                const isValidPassword = await bcrypt.compare(req.body.newpassword, result[0].password)
                 if(isValidPassword){
                    if(req.body.confirmpassword !== req.body.newpassword){
                        res.send(`
                            <html>
                            <head>
                            <title>Error</title>
                            </head>
                            <body>
                            <h4>Passwords do not match!</h4>
                            <p>You will be redirected back to change password page in 5 sec</p>
                            <script>
                            setTimeout(function(){
                            window.location.href = '/admin/change_password'
                            },5000)
                            </script>                               
                            </body>
                            </html>`)
                    }else{
                        const password = await bcrypt.hash(req.body.newpassword, 10)
                    mysqlConnection.query('UPDATE admin SET password = ? where username = ? ',
                        [password, verify.username], (err)=>{
                            if(err) throw err
                            res.send(`
                                <html>
                                <head>
                                <title>Success</title>
                                </head>
                                <body>
                                <h4>Password has been updated successfully!</h4>
                                <p>You will be redirected to the login page in 5 sec</p>
                                <script>
                                setTimeout(function(){
                                window.location.href = '/logout'
                                },5000)
                                </script>                               
                                </body>
                                </html>`)
                        })
                }
                }else{
                    res.send(`
                        <html>
                        <head>
                        <title>Error</title>
                        </head>
                        <body>
                        <h4>Invalid Password!</h4>
                        <p>You will be redirected back to change password page in 5 sec</p>
                        <script>
                        setTimeout(function(){
                        window.location.href = '/admin/change_password'
                        },5000)
                        </script>                               
                        </body>
                        </html>`)
                }
            }
            })
        }
    }catch(e){
        console.log(e)
    }
})
//GET: Admin logout route
app.get('/logout', (req, res)=>{
    res.cookie("jwt", "", {maxAge: 1})
    res.redirect('/admin/login')
  })
//POST: Admin Login Authentication
app.post('/admin/login', (req,res)=>{
    try{
        const {email, password} = req.body
        mysqlConnection.query('select * from admin where email = ?',[email], (err, result)=>{
                if(err)res.status(500).json({error: err.sqlMessage})
                if(result.length !== 1)
                return res.status(401).json({message: "Access Denied!"})
             const isMatch = bcrypt.compareSync(password, result[0].password)
             if(!isMatch){
                return res.status(401).json({message: "Access Denied!"})
             }
            const token = jwt.sign({email:email}, process.env.secret_key)
                res.cookie('jwt', token,{
                    maxAge: process.env.ExpiryHours,
                    httpOnly: true
                    })
                res.redirect('/admin/dashboard')

            })
    }catch(e){
        console.log(e)
    }
})

//POST: Admin add new booking
app.post('/new_booking', (req, res) => {
        // Destructure req.body
        const { fname, lname, phone, email, bookType, guests, reference, location, date, time, until } = req.body;
        const bookingid = { id:'tsk'+Date.now().toString(10) };
        const booking_status = 'Pending'

        // Prepare and execute the query
        let query = 'INSERT INTO booking VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        mysqlConnection.query(query, [bookingid.id, fname, lname, email, phone, bookType, location, date, time, until, booking_status, reference, guests],
            (err) => {
                // Handle query error
                if (err) {
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
                            <h1>You have successfully added a new booking</h1>
                            <p>You will be redirected back to the dashboard page in 5 seconds...</p>
                        </body>
                    </html>
                `);
            }
        );
    });

//GET: Admin retrieve and manage all booking records
app.get('/admin/manage_bookings',(req, res)=>{
    if(!req.cookies.jwt){
        res.redirect('/admin/login')
    }else{
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query('select * from booking', (err, result)=>{
            if(err) throw err
        mysqlConnection.query(`select * from admin where username = '${identity.username}'`, (err, admin)=>{
            if(err) throw err
        res.render('manage_bookings',{
            bookings:result,
            image:admin[0].profile_picture
        })
      })
    })
    }
  })
  
//GET: Admin manage tables
app.get('/admin/manage_tables',(req, res)=>{
    if(!req.cookies.jwt){
        res.redirect('/admin/login')
    }else{
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query('select * from tables', (err, result)=>{
            if(err) throw err
        mysqlConnection.query(`select * from admin where username = '${identity.username}'`, (err, admin)=>{
            if(err) throw err
        res.render('manage_tables',{
            tables:result,
            image:admin[0].profile_picture
        })
      })
    })
    }
  })
//POST: Admin Delete Booking
app.post('/admin/delete_booking', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.body
        mysqlConnection.query(`delete from booking where id = '${id}'`, (err, feedback)=>{
            if(err)throw err
                res.redirect('/admin/manage_booking')
        })
    }
})
//POST: Admin Update Booking
app.post('/admin/update_booking', (req, res)=>{
    try{
        if(req.cookies.jwt){
            let {id, lastname, firstname, email, phone, bookingType, tableLocation, guests, time, until, status} = req.body
            let date = new Date(req.body.date)
            console.log(date)
            let day = date.getDate()
            let month = date.getMonth() + 1
            let year = date.getFullYear()
            console.log(day, month, year)
            let formatDate = year+'-'+month+'-'+day
    mysqlConnection.query(`select * from booking where id = '${req.body.id}'`, (err, result)=>{
            if(err) throw err
            if(result.length == 1){
        let myquery = 'UPDATE booking SET Customer_FirstName = ?, Customer_LastName = ?, Email = ?, Phone_Number = ?, Booking_Type = ?, \
        Table_Location = ?, Date = ?, Time = ?, Until = ?, status = ?, guests = ? where id = ?'
        let data = [firstname, lastname, email, phone, bookingType, tableLocation, formatDate, time, until, status, guests, id]
    mysqlConnection.query(myquery, data, (err)=>{
        if(err)throw err
        res.json();
    })
}else{
    res.redirect('/admin/manage_booking')
}
})
        }
    }catch(e){
        console.log(e)
    }
})

//POST: Admin Delete Table
app.post('/admin/delete_table', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.body
        mysqlConnection.query(`delete from tables where id = '${id}'`, (err, feedback)=>{
            if(err)throw err
                res.redirect('/admin/manage_tables')
        })
    }
})
//POST: Admin Update Table
app.post('/admin/update_table', (req, res)=>{
    try{
        if(req.cookies.jwt){
            let {id, tableName, tableLocation, tableStatus, tableCapacity} = req.body
    mysqlConnection.query(`select * from tables where id = '${req.body.id}'`, (err, result)=>{
            if(err) throw err
            if(result.length == 1){
        let myquery = 'UPDATE tables SET table_location = ?, status = ?, table_name = ?, capacity = ? where id = ?'
        let data = [tableLocation, tableStatus, tableName, tableCapacity, id]
    mysqlConnection.query(myquery, data, (err)=>{
        if(err)throw err
        res.json();
    })
}else{
    res.redirect('/admin/manage_booking')
}
})
        }
    }catch(e){
        console.log(e)
    }
})
app.get('/admin', (req, res)=>{
    mysqlConnection.query('select * from admin', (err, result)=>{
        if(err) throw err
        return res.status(200).json(result)
    })
})
app.post('/admin', (req, res)=>{
    try{
    const {email, password, secretkey} = req.body
    mysqlConnection.query('select * from admin', (err, result)=>{
        if(err) return res.status(500).json(err)
        if(result.length === 1){
        return res.status(401).json({message: "Registration closed!"})
        }
        const hasedPassword =  bcrypt.hashSync(password, 10)
        const hasedSecret = bcrypt.hashSync(secretkey, 12)
    mysqlConnection.query('insert into admin values(?,?,?)', [email, hasedPassword, hasedSecret], (err, response)=>{
        if(err) return res.status(500).json(err)
        return res.status(201).json(response);        
    })
    })
}catch(e){
    return res.status(500).json({error: e.message})
}
})
app.delete('/admin', (req, res)=>{
    try{
        mysqlConnection.query('truncate table admin', (err)=>{
            if(err) return res.status(500).json(err.sqlMessage)
            return res.status(200).json({message: "Admin deleted successfully!"})
        })
    }catch(e){
        return res.status(500).json({error: e.message})
    }
})
app.listen(process.env.serverPort, ()=>{console.log(`server is listening to port ${process.env.serverPort}`)})
