const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();

const userdb = process.env.DB_NAME;
const dbuserpassword = process.env.DB_USER_PASSWORD;
const dbuser = process.env.DB_USER;
const dbhost = process.env.DB_HOST;
const dbport = process.env.DB_PORT;

const mysqlConnection = mysql.createConnection({
  user: dbuser,
  password: dbuserpassword,
  database: userdb,
  host: dbhost,
  port: dbport
});

mysqlConnection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully!');
  }
});

module.exports = mysqlConnection;
