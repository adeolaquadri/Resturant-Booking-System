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
    mysqlConnection.query('SELECT * FROM bookings WHERE status = ?', ["Pending"], (err, pending)=>{
      if (err) throw err;
    mysqlConnection.query('SELECT * FROM bookings WHERE status = ?', ["Completed"], (err, completed)=>{
      if (err) throw err;
    mysqlConnection.query('SELECT * FROM bookings WHERE status = ?', ["Cancelled"], (err, cancelled)=>{
      if (err) throw err;
     mysqlConnection.query('SELECT * FROM bookings', (err, bookings)=>{
      if (err) throw err;
      res.render('admindashboard', {
        admin: admin[0],
        email: identity.email,
        bookings: bookings,
        pending: pending,
        completed: completed,
        cancelled: cancelled
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




//POST: Admin add new bookings
router.post('/new_booking', (req, res) => {
        const { fname, lname, phone, email, bookType, guests, reference, location, date, time, until } = req.body;
        const bookingsid = { id:'tsk'+Date.now().toString(10) };
        const bookings_status = 'Pending'

        // Prepare and execute the query
        let query = 'INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        mysqlConnection.query(query, [bookingsid.id, fname, lname, email, phone, bookType, location, date, time, until, bookings_status, reference, guests],
            (err) => {
                // Handle query error
                if (err) {
                    return res.status(500).send('Error inserting data');
                }
                // Send success response
                res.send(`
                    <html>
                        <head>
                            <title>bookings Successful</title>
                            <link rel="icon" href="/images/logo-removebg-preview.png">
                            <script>
                                setTimeout(function() {
                                    window.location.href = '/admin/dashboard'; 
                                }, 5000); // 5 seconds
                            </script>
                        </head>
                        <body>
                            <h1>You have successfully added a new bookings</h1>
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
        res.render('change_password');
    }else{
        res.redirect('/admin/login');
    }
})
//PUT: Admin change password
router.put('/change_password', async(req, res)=>{
    try{
        if(!req.cookies.jwt) return res.status(401).json({success: false, message: 'Unauthourized Access!'})
        const verify = jwt.verify(req.cookies.jwt, process.env.secret_key)
        const {oldpassword, newpassword, confirmpassword} = req.body;
        mysqlConnection.query('SELECT password from admin WHERE email = ?', [verify.email], async(err, pass)=>{
        if(err) throw err;
        const isValidPassword = await bcrypt.compare(pass[0].password, oldpassword)
        if(isValidPassword){

        if(confirmpassword !== newpassword) 
        return res.status(401).json({success: false, message: "Passwords do not match"});

        const password = await bcrypt.hash(newpassword, 10)
        mysqlConnection.query('UPDATE admin SET password = ? where email = ? ', [password, verify.email], (err)=>{
        if(err) return res.status(500).json({success: false, message: "Error updating password"});
        return res.status(200).json({success: true, message: "Password updated successfully"});

        });
        }else{
            return res.status(401).json({success: false, message: "Invalid Password"});
        }
    })
    }catch(e){
       return res.status(500).json({success: false, message: "Error updating password"});
    }
})

//GET: Admin retrieve and manage all bookings records
router.get('/manage_bookings',(req, res)=>{
    if(!req.cookies.jwt){
        res.redirect('/admin/login')
    }else{
        const identity = jwt.verify(req.cookies.jwt, process.env.secret_key)
        mysqlConnection.query('select * from bookings', (err, result)=>{
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

router.get('/tables', async(req, res)=>{
    try{
        mysqlConnection.query('SELECT * from tables', (err, rows)=>{
            if(err) return res.status(500).json({message: err.sqlMessage});
           return res.status(200).json(rows);
        })
    }catch(e){
        return res.status(500).json({error: e.message});
    }
})


//POST: Admin Delete bookings
router.delete('/bookings/:id', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.params;
        mysqlConnection.query(`delete from bookings where id = ?`, [id], (err, feedback)=>{
        if(err) throw err;
        res.json({ success: true, message: 'bookings deleted successfully' });
        });
    };
})

//PUT: Admin Update bookings
router.put('/bookings/:id', (req, res)=>{
    try{
      const {status} = req.body;
      const {id} = req.params;

      if(req.cookies.jwt){
      let query = 'UPDATE bookings SET status = ? where id = ?'
      mysqlConnection.query(query, [status, id], (err, response)=>{
      if(err)throw err;
      res.json({ success: true, message: 'bookings updated successfully' });
    });
    }else{
    res.redirect('/admin/manage_bookings');
    };
    }catch(e){
        console.log(e);
    };
});

//POST: Admin Add Table
router.post('/table', async(req, res)=>{
    if(!req.cookies.jwt) res.redirect('/admin/login');
    try{
        const {table_number, location, capacity, status} = req.body
        let addTable = 'INSERT INTO tables(table_number, location, capacity, status) values(?,?,?,?)'
        let tableData = [table_number, location, capacity, status]
        mysqlConnection.query(addTable, tableData, (err)=>{
            if(err) return res.status(500).json({success: "false", message: "Error adding table"});
            return res.status(201).json({success: true, message: "Table created successfully"});
        })

    }catch(e){
        return res.status(500).json({success: false, message: 'Error adding table'})
    }
})

//DELETE: Admin Delete Table
router.delete('/table/:id', (req, res)=>{
    if(req.cookies.jwt){
        let {id} = req.params;
        mysqlConnection.query(`delete from tables where table_id = ?`, [id], (err)=>{
            if(err)throw err;
            res.json({ success: true, message: 'Table deleted successfully' });

        });
    }
})

//PUT: Admin Update Table
router.put('/table/:id', (req, res)=>{
    try{
        if(req.cookies.jwt){
          let {status} = req.body;
          let {id} = req.params;
          let myquery = 'UPDATE tables SET status = ? where table_id = ?'
          let data = [status, id]
        mysqlConnection.query(myquery, data, (err)=>{
           if(err) return res.status(500).json({success: false, message: 'Error updating table'});
          res.json({ success: true, message: 'Table updated successfully' });  })
}else{
    res.redirect('/admin/manage_bookings');
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

router.get('/bookingss', async(req, res)=>{
  try{
  mysqlConnection.query('SELECT * from bookings', (err, result)=>{
    if (err) throw err;
    return res.json(result);
  });
}catch(e){
  return res.status(500).json({message: e.message});
}
})

module.exports = router;