/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require("supertest");

const db = require("../models/index");
const app = require("../app");
var cheerio = require("cheerio");
let server, agent;
function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
    let response = await agent.get("/login");
    let csrfToken = extractCsrfToken(response);
    res = await agent.post("/session").send({ 
      email: username ,
      password: password,
      _csrf: csrfToken,
    });
  };
  describe("LMS Application", function () {
    beforeAll(async () => {
      await db.sequelize.sync({ force: true });
      server = app.listen(4000, () => {});
      agent = request.agent(server);
    });
  
    afterAll(async () => {
      try {
        await db.sequelize.close();
        await server.close();
      } catch (error) {
        console.log(error);
      } 
    })
test("Sign up as Teacher", async () => {
    let response = await agent.get("/signup");
    const csrfToken = extractCsrfToken(response);
    response = await agent.post("/users").send({
      firstName: "Test",
      lastName: "Users",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
      submit: "educator",
    });
    expect(response.statusCode).toBe(302);
  });
  test("Sign up as Student", async () => {
    let response = await agent.get("/signup");
    const csrfToken = extractCsrfToken(response);
    response = await agent.post("/users").send({
      firstName: "Test",
      lastName: "Users",
      email: "user.b@test.com",
      password: "12345678",
      _csrf: csrfToken,
      submit: "student",  
    });
    expect(response.statusCode).toBe(302);
  });

  test("view enrolled courses for a student", async () => {
    await login(agent, "user.b@test.com", "12345678");
    const courses = await agent.get("/studentcourses");
    expect(courses.statusCode).toBe(302);
  });
  test("view teacher's dashboard", async () => {
    await login(agent, "user.a@test.com", "12345678");

    const teacher = await agent.get("/teacher");
    expect(teacher.statusCode).toBe(302);
  });
  test("view student's dashboard", async () => {
    await login(agent, "user.b@test.com", "12345678");
    const student = await agent.get("/student");
    expect(student.statusCode).toBe(302);
  });
  test("View teacher's report", async () => {
    await login(agent, "user.a@test.com", "12345678");
    const teacher = await agent.get("/report");
    expect(teacher.statusCode).toBe(302);
  });
  test("should create a new course", async () => {
    await login(agent, "user.a@test.com", "12345678");

    const csrfToken = extractCsrfToken(await agent.get("/createcourse"));
    const newCourse = {
      courseName: "Testing in LMS",
      courseDescription: "Description for testing.",
      _csrf: csrfToken,
    };
    const newcourse = await agent.post("/createcourse").send(newCourse);
    expect(newcourse.statusCode).toBe(403);
  });
  test("Change Password", async () => {
    await login(agent, "user.a@test.com", "12345678");
    const csrfToken = extractCsrfToken(await agent.get("/Password"));
    const password = {
      currentPassword: "12345678",
      newPassword: "123456789",
      _csrf: csrfToken,
    };
    const response = await agent.post("/Password").send(password);
    expect(response.statusCode).toBe(403);

  });
  test("View all courses", async () => {
    await login(agent, "user.a@test", "12345678");
    const courses = await agent.get("/courses");
    expect(courses.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    response = await agent.get("/signout");
    expect(response.statusCode).toBe(302);
    response = await agent.get("/login");
    expect(response.statusCode).toBe(200);
  });
});

