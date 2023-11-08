const express = require("express")
const app = express();
const bcrypt = require('bcrypt')
var cookieParser = require("cookie-parser"); 
var csrf = require("csurf");
const path = require("path");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const { userInfo } = require("os");
const templatepath = path.join(__dirname, "views");
const passport = require("passport");   
const session = require('express-session');
const flash = require("connect-flash");
const LocalStrategy = require('passport-local');
const {Users} = require("./models");
const connnectEnsureLogin = require("connect-ensure-login");
const users = require("./models/users");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string")); 
app.set("view engine", "ejs");
app.use(cookieParser("shh! some secret string"));
app.use(session({
  secret: "my-super-secret-key-63693875353985691365693",
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
  } 
}));
app.use(csrf({ cookie: true }));
app.use(csrf({ cookie: true, value: (req) => req.csrfToken() }));

app.use(passport.initialize());
app.use(passport.session());  
app.use(flash());
passport.use(
  "local",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (email, password, done) => {
      Users.findOne({ where: { email: email } })
        .then(async (user) => {
          if (!user) {
            return done(null, false, { message: "User is no longer available" });
          }
          const result = await bcrypt.compare(password, user.password);

          if (!result) {
            return done(null, false, { message: "Password not recognized" });
          }

          if (user.role === "teacher") {
            return done(null, user, { role: "teacher" });
          } else if (user.role === "student") {
            return done(null, user, { role: "student" });
          } else {
            return done(null, false, { message: "Unrecognized role" });
          }
        })
        .catch((error) => {
          return done(error);
        }); 
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser((email, done) => {
  Users.findOne({ where: { email } })
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(new Error("User is no longer available"), null);
      }
    })
    .catch((error) => {
      done(error, null);
    });
});
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  next();
});
app.set("views", templatepath)
app.get("/", (request, response) => {
  if (request.isAuthenticated()) {
    if (request.user.role == "teacher") {
      return response.redirect("/teacher");
    } else {
      return response.redirect("/student");
    }
  }
  response.render("index", {
    title: "LMS",
    csrfToken: request.csrfToken(),
  });
});
app.get("/signup", (req, res) => {
    res.render("signup", {
      csrfToken: req.csrfToken(),
    })
})
app.get("/login" , (req,res) => {
  res.render("login",
  {csrfToken: req.csrfToken(),
  })
})

app.post("/users", async (request , response) => {
    const hashedpwd = await bcrypt.hash(request.body.password, 10)
    try {
    const User = await Users.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedpwd,
      role: request.body.role,
    });
    request.login(User, (err) => {
      if(err) {
        console.log(err)
      } 
      if(User.role === "teacher") {
        return response.redirect("/teacher")
      } else if(User.role === "student") {
        return response.redirect("/student") 
      }
      else {
        return response.redirect("/login")
      }
    })
    }catch(error) {
    console.log(error);
    console.error(error);

    }
  });

  app.post(
    "/logging",
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (request, response) => {
      // Authentication was successful
      if (request.user.role === "student") {
        response.redirect("/student");
      } else if (request.user.role === "teacher") {
        response.redirect("/teacher");
      } else {
        response.redirect("/login");
      }
    },
  );
app.get("/logout", (request, response) => {
    request.logout();
    response.redirect("/login");
  });
app.get("/teacher", (req,res) => {
  res.render("teacher", {
  csrfToken: req.csrfToken(),
  })
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
app.get(
  "/student",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {

      response.render("student", {
        title: "Student Dashboard",
      
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);
app.get("/Password", (request, reponse) => {
  const currentUser = request.user;

  reponse.render("Password", {
    currentUser,
    csrfToken: request.csrfToken(),
  });
});
app.get(
  "/teacher",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {

      response.render("teacher", {
        title: "Teacher Dashboard",

        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);
app.post("/Password", async (request, response) => {
  const userEmail = request.body.email;
  const newPassword = request.body.password;

  try {

    const user = await Users.findOne({ where: { email: userEmail } });

    if (!user) {
      request.flash("error", "User with that email does not exist.");
      return response.redirect("/Password");
    }

    const hashedPwd = await bcrypt.hash(newPassword, saltRounds);


    await user.update({ password: hashedPwd });


    return response.redirect("/login");
  } catch (error) {
    console.log(error);
    request.flash("error", "Error updating the password.");
    return response.redirect("/Password");
  }
});
app.get("/signout", (request, response, next) => {

  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});