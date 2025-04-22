const { Pool } = require("pg");
require("dotenv").config();
const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,

});

db.on("error", (err, client) => {
    console.error("Database connection error:", err.stack);
});
module.exports = db;
