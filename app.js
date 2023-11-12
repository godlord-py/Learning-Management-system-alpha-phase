const express = require("express")
const app = express();
const bcrypt = require('bcrypt')
var cookieParser = require("cookie-parser"); 
var csrf = require("csurf");
const path = require("path");
const bodyParser = require("body-parser");
const port = process.env.PORT || 3000; 
const ejs = require('ejs');
const { userInfo } = require("os");
const templatepath = path.join(__dirname, "views");
const passport = require("passport");   
const session = require('express-session');
const flash = require("connect-flash");
const LocalStrategy = require('passport-local');
const {Users, Courses, Enrollments, Pages, Chapters} = require("./models");
const connnectEnsureLogin = require("connect-ensure-login");
const { connect } = require("http2");
const saltRounds = 10;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string")); 
app.set("view engine", "ejs");

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
  if (!request.body.role) {
    request.flash("error", "Role is required");
    return response.redirect("/signup");
  }
  if (request.body.email.length == 0) {
    request.flash("error", "Email address is required");
    return response.redirect("/signup");
  }

  if (request.body.firstName.length == 0) {
    request.flash("error", "First name is required");
    return response.redirect("/signup");
  }

  if (request.body.lastName.length == 0) {
    request.flash("error", "Last name is required");
    return response.redirect("/signup");
  }

  if (request.body.password.length < 8) {
    request.flash("error", "Your password is too short. Need atleast 8 characters to make it stronger");
    return response.redirect("/signup");
  }
    const hashedpwd = await bcrypt.hash(request.body.password, saltRounds)
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

app.listen(port, () => {
  console.log("started");
});

app.get(
  "/student",
  connnectEnsureLogin.ensureLoggedIn(), 
  async (request, response) => {
    const currentUser = request.user;
    try {
      const existingCourses = await Courses.findAll();
      const existingUsers = await Users.findAll();
      const existingEnrollments = await Enrollments.findAll();


      response.render("student", {
        title: "Student Dashboard", 
        courses: existingCourses,
        users: existingUsers,
        enrols: existingEnrollments,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);
app.get(
  "/teacher",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {
      const existingCourses = await Courses.findAll();
      const existingUsers = await Users.findAll();
      const existingEnrollments = await Enrollments.findAll();


      response.render("teacher", {
        title: "Teacher Dashboard",
        courses: existingCourses,
        users: existingUsers,
        enrols: existingEnrollments,
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
app.get(
  "/createcourse",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = await Users.findByPk(request.user.id);
    response.render("createcourse", {
      title: "Create New Course",
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);
app.post(
  "/createcourse",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.courseName.length == 0) {
      request.flash("error", "Please Enter A Course Name!");
      return response.redirect("/teacher");
    }

    if (request.body.courseDescription.length == 0) {
      request.flash("error", "Description is empty! Please enter description");
      return response.redirect("/teacher");
    }
    console.log(request.body.courseName);
    try {
      await Courses.addcourse({
        courseName: request.body.courseName,
        courseDescription: request.body.courseDescription,
        email: request.user.email,
        userId: request.user.id,
      });
      response.redirect("/teacher");
     
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  },
);
app.get(
  "/studentcourses",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {
      const enrolledCourses = await Enrollments.findAll({
        where: { userId: currentUser.id },
      });
      const courseIds = enrolledCourses.map(
              (enrollment) => enrollment.courseId,
            );
      const courses = await Courses.findAll({ where: { id: courseIds } });
      response.render("studentcourses", {
        title: "Student Courses",
        courses,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);
app.get(
  "/courses",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.isAuthenticated()) {
      return response.redirect("/login");
    } 
    try {
      const currentUser = request.user;
      if (!currentUser) {
        return response.status(404).json({ message: "User not found" });
      }
      const userCourses = await Courses.getCourses();
      // console.log("list course=>",userCourses);
      response.render("courses", {
        title: "Courses",
        courses: userCourses,
        currentUser,
        csrfToken: request.csrfToken(),
      });
      // console.log(courses);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  },
);
app.get(
  "/studentcourses",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.isAuthenticated()) {
      return response.redirect("/login");
    } 
    try {
      const currentUser = request.user;
      if (!currentUser) {
        return response.status(404).json({ message: "User not found" });
      }
      const userCourses = await Courses.getCourses();
      response.render("studentcourses", {
        title: "Student Courses",
        courses: userCourses,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  },
);
app.get("/enroll", (request, response) => {
  response.render("enroll", {
    title: "Enroll",
    csrfToken: request.csrfToken(),
  });
});
app.get("/createchapters", (request, response) => {
  response.render("createchapters", {
    title: "Chapter",
    csrfToken: request.csrfToken(),
  }); 
});

app.get("/viewcourses", (request, response) => {
  response.render("viewcourses", {
    title: "View Courses",
    csrfToken: request.csrfToken(),
  });
});
app.get(
  "/report",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.isAuthenticated()) {

      return response.redirect("/login");
    }
    try {
      const currentUser = request.user;
      if (!currentUser) {

        return response.status(404).json({ message: "User not found" });
      }
      const userCourses = await currentUser.getCourses();
      response.render("report", {
        title: "Courses Report",
        courses: userCourses,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  },
);
app.get("/view-course/:id", async (request, response) => {
  try {
    const id = request.params.id;
    const courseId = request.params.id;
    const course = await Courses.findByPk(courseId);
    const userofCourse = await Users.findByPk(course.id);
    const currentUserId = request.query.currentUserId;
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));
    const existingEnrollments = await Enrollments.findAll();
    const chapters = await Chapters.getChapters({ where: { courseId } });
    if (!course) {
      return response.status(404).json({ message: "Course not found" });
    }
    response.render("viewcourses", {
      title: "view course",
      course,
      chapters,
      userofCourse,
      enrolls: existingEnrollments,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Internal server error" });
  }
});
app.delete(
  "/courses/:id", 
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("Delete: ", request.params.id);

    try {
      const status = await Courses.remove(request.params.id);
      return response.json(status ? true : false);
    } catch (err) {
      return response.status(422).json(err);
    } 
  },
);
app.get(
  "/view-course/:id/viewcourse",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const courseId = request.params.id;
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const currentUserId = request.query.currentUserId;
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));

    response.render("createchapters", {
      title: "Chapters",
      courseId,
      course,
      userOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/view-course/:id/viewcourse",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.body.userId;
    // if (request.body.chapterName.length == 0) {
    //   request.flash("error", "Chapter name cannot be empty!");
    //   return response.redirect(
    //     `/viewcourses/${courseId}?currentUserId=${request.query.currentUserId}`,
    //   );
    // }
    // if (request.body.chapterDescription.length == 0) {
    //   request.flash("error", "Description cannot be empty!");
    //   return response.redirect(
    //     `/viewcourses/${request.body.courseId}?currentUserId=${request.query.currentUserId}`,
    //   ); 
    // }
    try {
      await Chapters.create({ 
        chapterName: request.body.chapterName,
        chapterDescription: request.body.chapterDescription,     
        userId,   
      });
      response.redirect(
        `/viewcourses/${request.body.userId}?currentUserId=${request.query.currentUserId}`,
      ); 
    } catch (error) { 
      console.log(error); 
      return response.status(422).json(error);
    }
  },
);

app.get("/view-course/:id/showpages", async (request, response) => {
  connnectEnsureLogin.ensureLoggedIn();
    const chapterId = request.params.id; 
    const chapter = await Chapters.findByPk(chapterId);
    const courseId =  chapterId; 
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const existingEnrollments = await Enrollments.findAll(); 
    const currentUserId = request.query.currentUserId;
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));
    const pages = await Pages.findAll({ where: { chapterId } });
    response.render("showpages", { 
      title: "Page",
      chapterId, 
      courseId,
      chapter,
      pages,
      course,
      userOfCourse,
      enrols: existingEnrollments,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);
app.post(
  "/view-course/:id/showpages",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const chapter = await Chapters.findByPk(request.body.chapterId);
    const chapterId = request.params.id; 
    const courseId =  chapterId; 
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const existingEnrollments = await Enrollments.findAll(); 
    const currentUserId = request.query.currentUserId;
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId)); 
    const pages = await Pages.findAll({ where: { chapterId } });
    // if (request.body.pageName.length == 0) {
    //   // console.log(length)
    //   request.flash("error", "Page name cannot be empty!");
    //   return response.redirect(
    //     `/view-course/${request.body.chapterId}/showpages ?currentUserId=${request.query.currentUserId}`,
    //   );
    // } 
    // if (request.body.pageDescription.length == 0) {  
    //   request.flash("error", "Page content cannot be empty!"); 
    //   return response.redirect(
    //     `/view-course/${request.body.chapterId}/showpages?currentUserId=${request.query.currentUserId}`,
    //   );
    // }
    try {
      await Pages.create({ 
        head: request.body.pageName, 
        info: request.body.pageDescription,
        chapterId: request.body.chapterId, 
      });
      response.redirect(
        `/view-course/${request.body.chapterId}/showpages?currentUserId=${request.query.currentUserId}`,
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  },
);
app.post(
  "/enroll-course/:courseId",
  connnectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const courseId = request.params.courseId;
    const currentUserId = request.query.currentUserId;
    const existingEnrollment = await Enrollments.findOne({
      where: { userId: currentUserId, courseId },
    });
    if (existingEnrollment) {

      return response.status(400).json({ message: "Already Enrolled!" });
    }
    await Enrollments.create({
      userId: currentUserId,
      courseId,
    }); 

    response.redirect("/student");
  },
);


app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) { 
      return next(err);
    }
    response.redirect("/");
  });
});


