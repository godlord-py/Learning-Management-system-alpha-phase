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
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
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
  console.log("Serialize user called");
  console.log(user)
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Users.findByPk(id)
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(new Error("User not found"), null);
      }
    })
    .catch((error) => {
      done(error, null);
    });
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
  {csrfToken: req.csrfToken(),})
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
    csrfToken: request.csrfToken(),
  })
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
app.get(
  "/student",
  // connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {
      // const existingCourses = await Courses.findAll();
      const existingUsers = await Users.findAll();
      // const existingEnrollments = await Enrollments.findAll();


      response.render("student", {
        title: "Student Dashboard",
        // courses: existingCourses,
        // users: existingUsers,
        // enrols: existingEnrollments,
        // currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);
