require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 8081;
const app = express();
app.get('/', (re, res) => {
    res.send("Backend server");
})
app.listen(port, (err) => {
    if (err) {
        console.log(`Error: ${err.message}`);
    } else {
        console.log(`Listening port ${port}`);
    }


})