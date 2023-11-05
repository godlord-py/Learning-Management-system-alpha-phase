const express = require("express")
const app = express();
const bcrypt = require('bcrypt')
const User = []
// const ejs = require('ejs');
const path = require("path");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const { userInfo } = require("os");
const templatepath = path.join(__dirname, "views");
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
const passport = require("passport");
const session = require('express-session');
const flash = require("connect-flash");
const LocalStrategy = require('passport-local');
app.use(flash());
app.use(session({
  secret: "my-super-secret-key-63693875353985691365693",
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
  } 
}))
passport.use(new LocalStrategy({
  usernameField: "email",
  passwordField: "password",
}, (username, password, done) => {
  User.findOne({where: {email: username}})
    .then(async function(user)  {
      const result = await bcrypt.compare(password, user.password)
      if(result) {
        return done(null, user)
      }else {
        return done(null, false, {message: "Incorrect password"})
      }
    }).catch((error) => {
      return done(null, false, {
        message: "Account doesn't exist",
      })

    }) 
}))
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
app.use(passport.initialize());
app.use(passport.session());
app.set("views", templatepath)
app.get("/", (req, res) => { 
    res.render("index")
}) 
app.get("/signup", (req, res) => {
    res.render("signup")
})
app.post("/users", async (request , response) => {
  if("/signupe") {
    const hashedpwd = await bcrypt.hash(request.body.password, 10)
    try {
    const user = await User.push({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedpwd,
    });
    request.login(user, (err) => {
      if(err) {
        console.log(err)
     
      } 
      response.redirect("/logine");  
    })
    }catch(error) {
    console.log(error);
    }
    }
    else if("/signups") {
      const hashedpwd = await bcrypt.hash(request.body.password, 10)
      try {
      const user = await User.push({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedpwd,
      });
      request.login(user, (err) => {
        if(err) {
          console.log(err)
       
        } 
        response.redirect("/student");  
      })
      }catch(error) {
      console.log(error);
      }
      }
})
app.get("/login" , (req,res) => {
    res.render("signin")
})
app.get("/logine", (req,res) => {
    res.render("logine")
})
app.get("/logins", (req,res) => {
    res.render("logins")
})
app.get("/students", (req,res) => {
  res.render("students", {
    name: req.user.firstName
  })
})
app.post("/session", passport.authenticate('local', {failureRedirect: "/login", failureFlash: true}), 
function (request , response) {
  console.log(request.user);
  response.redirect("/todos");
});
app.get("/signupe", (req,res) => {
    res.render("signupe")
})  
app.post("/signupe", async (req, res)=> {
  try{
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    User.create({
      firstName : req.body.firstName,
      lastName : req.body.lastName,
      email : req.body.email,
      password : hashedPassword
    })
    res.redirect("/login")
  }catch{
    res.redirect("/signupe")
  }
  console.log(User)
})
app.get("/signups", (req,res) => {
    res.render("signups")
})
app.post("/signups", async (req, res)=> {
  try{
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    User.create({
      firstName : req.body.firstName,
      lastName : req.body.lastName,
      email : req.body.email,
      password : hashedPassword
    })
    res.redirect("/login")
  }catch{
    res.redirect("/signups")
  }
  console.log(User)
})
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
  