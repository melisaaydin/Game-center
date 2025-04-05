const { Pool } = require("pg");
const db = new Pool({
    host: "localhost",
    user: "postgres",
    password: "484425",
    database: "signup",
    port: 5433,
});

module.exports = db;
