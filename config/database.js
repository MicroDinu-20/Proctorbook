const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = mysql.createPool(
    {
    uri: process.env.MYSQL_URL,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
}
//RAILWAY
//  {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE,
//     // port: process.env.MYSQLPORT,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// }
);


async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to Railway MySQL!');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
};

module.exports = pool;
