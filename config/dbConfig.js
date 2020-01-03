// if (process.env.NODE_ENV == 'local') {

var mysql = require('mysql');
console.log(process.env.HOST)
let connection;
if (process.env.NODE_ENV != 'live') {
    connection = mysql.createPool({
        connectionLimit: 70,
        host: 'localhost',
        user: 'root',
        password: 'illuminz',
        database: 'STN_database',
        charset: 'utf8mb4'
    });
} else {
    connection = mysql.createPool({ // live credential
        connectionLimit: 70,
        host: `${process.env.MYSQL_HOST}`,
        user: `${process.env.MYSQL_USER}`,
        password: `${process.env.MYSQL_PASSWORD}`,
        database: `${process.env.MYSQL_DB}`,
        charset: 'utf8mb4',


    });


}

connection.getConnection(function(err) {
    if (err) throw err;
});

module.exports = connection;