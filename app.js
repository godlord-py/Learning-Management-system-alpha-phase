const express = require("express")
const app = express();
const bcrypt = require('bcrypt')
var cookieParser = require("cookie-parser"); 
var csrf = require("csurf");
const path = require("path");
const bodyParser = require("body-parser");
const port = process.env.PORT || 3000; 
const methodOverride = require('method-override');
const ejs = require('ejs');
const { userInfo, type } = require("os");
const csrfProtection = csrf();``
const templatepath = path.join(__dirname, "views");
const passport = require("passport");   
const session = require('express-session');
const flash = require("connect-flash");
const LocalStrategy = require('passport-local');
const {Users, Courses, Enrollments, Pages, Chapters} = require("./models");
const connectEnsureLogin = require("connect-ensure-login");
const { connect } = require("http2");
const chapters = require("./models/chapters");
const saltRounds = 10;  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string")); 
app.set("view engine", "ejs");
app.use(methodOverride('_method'));
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
//I serialized using email because it is unique and I deserialized using email because it is unique.
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
  //logout
app.get("/logout", (request, response) => {
    request.logout();
    response.redirect("/login");
  });


//get student
app.get(
  "/student",
  connectEnsureLogin.ensureLoggedIn(), 
  async (request, response) => {
    const currentUser = request.user;
    try {
      const existingCourses = await Courses.findAll();
      const existingUsers = await Users.findAll();
      const existingEnrollments = await Enrollments.findAll();
      const chapterId = request.params.id;
      response.render("student", {
        title: "Student Dashboard", 
        courses: existingCourses,
        users: existingUsers,
        enrols: existingEnrollments,
        currentUser,
        chapterId,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(422).json(error);
    }
  },
);  
//get teacher
app.get(
  "/teacher",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = request.user;
    try {
      const existingCourses = await Courses.findAll();
      const existingUsers = await Users.findAll();
      const existingEnrollments = await Enrollments.findAll();
      console.log(existingEnrollments)
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
//update password
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
//get createcourse
app.get(
  "/createcourse",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUser = await Users.findByPk(request.user.id);
    response.render("createcourse", {
      title: "Create New Course",
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);
//create a course
app.post(
  "/createcourse",
  connectEnsureLogin.ensureLoggedIn(),
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
//get studentcourses
app.get(
  "/studentcourses",
  connectEnsureLogin.ensureLoggedIn(),
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
//get courses
app.get(
  "/courses",
  connectEnsureLogin.ensureLoggedIn(),
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
//get studentcourses
app.get(
  "/studentcourses",
  connectEnsureLogin.ensureLoggedIn(),
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
//get report
app.get(
  "/report",
  connectEnsureLogin.ensureLoggedIn(),
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

      // Fetch enrollment count for each course
      const coursesWithEnrollmentCount = await Promise.all(
        userCourses.map(async (course) => {
          const enrollmentCount = await course.countEnrollments();
          return { course, enrollmentCount };
        })
      );

      // Get the total number of enrollments for all courses
      const totalEnrollments = await Enrollments.count();

      response.render("report", {
        title: "Courses Report",
        courses: coursesWithEnrollmentCount,
        totalEnrollments,
        currentUser,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  }
);


//get viewcourses
app.get("/view-course/:id", async (request, response) => {
  try {
    const id = request.params.id;
    const courseId = request.params.id;
    const course = await Courses.findByPk(courseId);
    const userofCourse = await Users.findByPk(course.id);
    const currentUserId = request.query.currentUserId;
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));
    const existingEnrollments = await Enrollments.findAll();
    const chapters = await Chapters.findAll({ where: { courseId } });
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
//get createchapters
app.get(
  "/view-course/:id/viewcourse",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const courseId = Number(request.params.id);
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const currentUserId = Number(request.query.currentUserId);
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));
    // console.log("courseId", courseId),
    // console.log("id", userOfCourseId),
    // console.log("currentUserId", currentUserId),
    // console.log(typeof currentUserId),
    // console.log(typeof userOfCourseId),
    // console.log(typeof courseId),
    // console.log(request.params.id)
    response.render("createchapters", {
      title: "Chapters", 
      courseId,
      course,
      userId,
      userOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);
//create a chapter
app.post(
  "/view-course/:id/viewcourse",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const courseId = Number(request.params.id);
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const currentUserId = Number(request.query.currentUserId);
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));
    const existingEnrollments = await Enrollments.findAll();
    // console.log(request.body)
    try {
      const chapters = await Chapters.create({
        chapterName: request.body.chapterName,
        chapterDescription: request.body.chapterDescription,
        courseId: Number(request.body.courseId),
      });  
      // console.log(chapters)
      // console.log(request.body) 
      response.redirect(
        `/view-course/${request.body.courseId}/?currentUserId=${request.query.currentUserId}`,
      );
      // console.log(request.body) 
    } catch (error) {
      console.log(error); 
      return response.status(422).json(error);
    } 
  },
);
//render showpages
app.get("/view-course/:id/showpages", async (request, response) => {
  connectEnsureLogin.ensureLoggedIn();
    const userId = request.user.id;
    const chapterId = Number(request.params.id); 
    const chapter = await Chapters.findByPk(chapterId);
    const courseId =  Number(request.params.id);   
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    // console.log(userOfCourseId)
    const userOfCourse = await Users.findByPk(userOfCourseId); 
    const existingEnrollments = await Enrollments.findAll();  
    const currentUserId = Number(request.query.currentUserId); 
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));  
    const pages = await Pages.findAll({ where: { chapterId } }); 
    try {
      const userOfCourse = await Users.findByPk(userOfCourseId);
      console.log('userOfCourse:', userOfCourse); // Debugging statement
    
      if (userOfCourse) {
        // ... (existing code with rendering) 
      } else {
        console.error('User of Course not found.');
        // Handle the case where the user is not found, perhaps redirect or show an error page.
      }
    } catch (error) {
      console.error('Error fetching userOfCourse:', error);
      // Handle the error, perhaps redirect or show an error page.
    } 
    response.render("showpages", {  
      title: "Page",
      chapterId,   
      userId,
      courseId, 
      chapter,  
      pages, 
      course,
      enrolls: existingEnrollments, 
      userOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
  },
);
//create a page 
app.post( 
  "/view-course/:id/showpages",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const chapter = await Chapters.findByPk(request.body.chapterId);
    const chapterId = Number(request.params.id); 
    const courseId =  Number(request.params.id); 
    const course = await Courses.findByPk(courseId);
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId);
    const existingEnrollments = await Enrollments.findAll(); 
    const currentUserId = Number(request.query.currentUserId);
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId)); 
    const pages = await Pages.findAll({ where: { chapterId } });
    // console.log(request.body)
    // console.log(chapterId) 
    // console.log(userId)
    try { 
      await Pages.create({ 
        head: request.body.head, 
        info: request.body.info,
        chapterId: Number(request.body.chapterId), 
        isComplete: false,  
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
//enroll logic
app.post(
  "/enroll-course/:courseId",
  connectEnsureLogin.ensureLoggedIn(),
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
//get pages
app.get("/view-course/:id/page", async (request, response) => {
  connectEnsureLogin.ensureLoggedIn();
    const chapterId = request.params.id; 
    const chapter = await Chapters.findByPk(chapterId);
    const courseId =  Number(request.params.id);  
    const course = await Courses.findByPk(courseId); 
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId); 
    const existingEnrollments = await Enrollments.findAll();  
    const currentUserId = Number(request.query.currentUserId); 
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));  
    const pages = await Pages.findAll({ where: { chapterId } }); 
    response.render("pages", {
      title: "Pages",
      chapterId, 
      courseId,
      chapter,
      pages,
      existingEnrollments,
      course,
      userOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
})
//render pages
app.post("/view-course/:id/page", async (request, response) => {
  connectEnsureLogin.ensureLoggedIn();
    const userId = request.user.id;
    const chapterId = request.params.id; 
    const chapter = await Chapters.findByPk(chapterId);
    const courseId =  Number(request.params.id);  
    const course = await Courses.findByPk(courseId); 
    const userOfCourseId = course.userId;
    const userOfCourse = await Users.findByPk(userOfCourseId); 
    const existingEnrollments = await Enrollments.findAll();  
    const currentUserId = Number(request.query.currentUserId); 
    const currentUser = await Users.findByPk(decodeURIComponent(currentUserId));  
    const pages = await Pages.findAll({ where: { chapterId } }); 
    response.render("pages", {
      title: "Pages",
      chapterId, 
      courseId,
      userId,
      chapter,
      pages,
      course,
      existingEnrollments,
      userOfCourse,
      currentUser,
      csrfToken: request.csrfToken(),
    });
})
//mark as complete 
app.post("/view-course/:id/complete", async (request, response) => {
  connectEnsureLogin.ensureLoggedIn();
  try {
    const userId = request.user.id;
    const courseId = request.body.courseId;
    const chapterId = request.body.chapterId;
    const pageId = Number(request.body.pageId);

    console.log("Received parameters:");
    console.log("userId:", userId);
    console.log("courseId:", courseId);
    console.log("chapterId:", chapterId);
    console.log("pageId:", pageId);  
    // console.log("body:", request.body)
    // Check for existing enrollment 
    const existingEnrollment = await Enrollments.findOne({
      where: { userId, courseId, chapterId, pageId },
    });

    if (existingEnrollment) {  
      // Update the existing enrollment if necessary
      existingEnrollment.isComplete = true;
      await existingEnrollment.save();
    } else { 
      // Create a new enrollment
      await Enrollments.create({
        userId,
        courseId,
        chapterId,
        pageId,  
        isComplete: true,
      });
    }
 
    response.redirect(`/view-course/${courseId}/showpages?currentUserId=${userId}`);
  } catch (error) {
    console.error("Error marking page as complete", error);
    response
      .status(500)
      .send("An error occurred while marking the page as complete");
  }
});


app.delete(
  "/view-course/:id/delete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const currentUserId = request.query.currentUserId;
    const userId = request.user.id;
    const courseId = Number(request.params.id);
    console.log("UserId:", userId);
    console.log("CurrentUserId:", currentUserId);
    try {
      // Step 1: Find the course by its ID
      const foundCourse = await Courses.findByPk(courseId);
      
      if (!foundCourse) { 
        // Handle the case where the course is not found 
        return response.status(404).json({ error: "Course not found" });
      }

      // Step 2: Find all chapters associated with the course
      const chapters = await Chapters.findAll({ where: { courseId: foundCourse.id } });

      // Step 3: Delete all pages associated with each chapter
      for (const chapter of chapters) {
        await Pages.destroy({ where: { chapterId: chapter.id } });
      }
      // Step 4: Delete all chapters associated with the course
      await Chapters.destroy({ where: { courseId: foundCourse.id } });

      // Step 5: Finally, remove the course itself
      const output = await Courses.destroy({ where: { id: foundCourse.id } });

      // Step 6: Return the response
      return response.json(output ? true : false);
    } catch (err) {
      console.error(err);
      return response.status(422).json(err);
    }
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) { 
      return next(err);
    }
    response.redirect("/");
  });
});


module.exports = app;