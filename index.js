const express = require("express")
const app = express();
// const ejs = require('ejs');
const path = require("path");
const bodyParser = require("body-parser");
const ejs = require('ejs')
app.set('view engine', 'ejs');
app.get("/", (req, res) => { 
    res.render("index")
})
app.get("/signup", (req, res) => {
    res.render("signup")
})
app.get("/login" , (req,res) => {
    res.render("signin")
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
  