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


//GET: Admin Profile Route
router.get('/profile', (req, res) => {
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

//GET: Admin add new booking
router.get('/new_booking', (req,res)=>{
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

//POST: Admin add new booking
router.post('/new_booking', (req, res) => {
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


//GET:Admin change password route
router.get('/change_password', (req ,res)=>{
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
router.post('/change_password', (req, res)=>{
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

//GET: Admin retrieve and manage all booking records
router.get('/manage_bookings',(req, res)=>{
    if(!req.cookies.jwt){
        res.redirect('/admin/login')
    }else{
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query('select * from booking', (err, result)=>{
          if(err) throw err;
        res.render('manage_bookings',{
            bookings:result,
      });
    });
    };
  });
  
//GET: Admin manage tables
router.get('/manage_tables',(req, res)=>{
    if(!req.cookies.jwt){
        res.redirect('/admin/login');
    }else{
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key);
        mysqlConnection.query('select * from tables', (err, result)=>{
          if(err) throw err;
        res.render('manage_tables',{
            tables:result,
      });
    });
    };
  });

//POST: Admin Delete Booking
router.delete('/bookings/:id', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.params;
        mysqlConnection.query(`delete from booking where id = ?`, [id], (err, feedback)=>{
        if(err) throw err;
        res.json({ success: true, message: 'Booking deleted successfully' });
        });
    };
})

//POST: Admin Update Booking
router.put('/bookings/:id', (req, res)=>{
    try{
      const {status} = req.body;
      const {id} = req.params;

      if(req.cookies.jwt){
      let query = 'UPDATE booking SET status = ? where id = ?'
      mysqlConnection.query(query, [status, id], (err, response)=>{
      if(err)throw err;
      res.json({ success: true, message: 'Booking updated successfully' });
    });
    }else{
    res.redirect('/admin/manage_booking');
    };
    }catch(e){
        console.log(e);
    };
});

//POST: Admin Delete Table
router.delete('/table/:id', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.params;
        mysqlConnection.query(`delete from tables where id = ?`, [id], (err)=>{
            if(err)throw err;
            res.json({ success: true, message: 'Table deleted successfully' });

        });
    }
})

//POST: Admin Update Table
router.put('/table/:id', (req, res)=>{
    try{
        if(req.cookies.jwt){
          let {id, tableName, tableLocation, tableStatus, tableCapacity} = req.body;
    mysqlConnection.query(`select * from tables where id = ?`, [id], (err, result)=>{
            if(err) throw err;
            if(result.length === 1){
        let myquery = 'UPDATE tables SET table_location = ?, status = ?, table_name = ?, capacity = ? where id = ?'
        let data = [tableLocation, tableStatus, tableName, tableCapacity, id]
    mysqlConnection.query(myquery, data, (err)=>{
        if(err) throw err;
          res.json({ success: true, message: 'Table updated successfully' });

    })
}else{
    res.redirect('/admin/manage_booking');
};
});
        };
    }catch(e){
        console.log(e);
    };
});

//Fetch admin details
router.get('/', (req, res)=>{
    mysqlConnection.query('select * from admin', (err, result)=>{
        if(err) throw err;
        return res.status(200).json(result);
    });
});

router.post('/', (req, res)=>{
    try{
    const {email, password, secretkey} = req.body;
    mysqlConnection.query('select * from admin', (err, result)=>{
        if(err) return res.status(500).json(err);
        if(result.length === 1){
        return res.status(401).json({message: "Registration closed!"})
        }
        const hasedPassword =  bcrypt.hashSync(password, 10);
        const hasedSecret = bcrypt.hashSync(secretkey, 12);
    mysqlConnection.query('INSERT INTO admin values(?,?,?)', [email, hasedPassword, hasedSecret], (err, response)=>{
        if(err) return res.status(500).json(err);
        return res.status(201).json(response);        
    });
    });
}catch(e){
    return res.status(500).json({error: e.message});
};
});

//Delete admin
router.delete('/', (req, res)=>{
    try{
        mysqlConnection.query('truncate table admin', (err)=>{
            if(err) return res.status(500).json(err.sqlMessage)
            return res.status(200).json({message: "Admin deleted successfully!"})
        });
    }catch(e){
        return res.status(500).json({error: e.message})
    };
});


// Admin logout
router.get('/logout', (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/admin/login');
});

router.get('/bookings', async(req, res)=>{
  try{
  mysqlConnection.query('SELECT * from booking', (err, result)=>{
    if (err) throw err;
    return res.json(result);
  });
}catch(e){
  return res.status(500).json({message: e.message});
}
})

module.exports = router;