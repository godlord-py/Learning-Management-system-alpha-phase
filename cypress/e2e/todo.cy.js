const cheerio = require('cheerio');

describe('LMS Application', function () {
  const extractCsrfToken = (response) => {
    const $ = cheerio.load(response.body);
    return $("[name=_csrf]").val();
  };

  const login = (username, password) => {
    cy.request({
      method: 'GET',
      url: '/login',
    }).then((response) => {
      const csrfToken = extractCsrfToken(response);
      cy.request({
        method: 'POST',
        url: '/users',
        form: true,
        body: {
          email: username,
          password: password,
          _csrf: csrfToken,
        },
      });
    });
  };

  it('Sign up as Teacher', () => {
    cy.request({
      method: 'GET',
      url: '/signup',
    }).then((response) => {
      const csrfToken = extractCsrfToken(response);
      cy.request({
        method: 'POST',
        url: '/users',
        form: true,
        body: {
          firstName: 'Test',
          lastName: 'Users',
          email: 'user.a@test.com',
          password: '12345678',
          _csrf: csrfToken,
          submit: 'educator',
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  it('Sign up as Student', () => {
    cy.request({
      method: 'GET',
      url: '/signup',
    }).then((response) => {
      const csrfToken = extractCsrfToken(response);
      cy.request({
        method: 'POST',
        url: '/users',
        form: true,
        body: {
          firstName: 'Test',
          lastName: 'Users',
          email: 'user.b@test.com',
          password: '12345678',
          _csrf: csrfToken,
          submit: 'student',
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
  it('view enrolled courses for a student', () => {
    login('user.b@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/studentcourses',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it("view teacher's dashboard", () => {
    login('user.a@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/teacher',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it("view student's dashboard", () => {
    login('user.b@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/student',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it("View teacher's report", () => {
    login('user.a@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/report',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it('should create a new course', () => {
    login('user.a@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/createcourse',
    }).then((response) => {
      const csrfToken = extractCsrfToken(response);
      cy.request({
        method: 'POST',
        url: '/createcourse',
        form: true,
        body: {
          courseName: 'Testing in LMS',
          courseDescription: 'Description for testing.',
          _csrf: csrfToken,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  it('View all courses', () => {
    login('user.a@test.com', '12345678');
    cy.request({
      method: 'GET',
      url: '/courses',
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it('Sign out', () => {
    cy.request({
      method: 'GET',
      url: '/signout',
    }).then((response) => {
      expect(response.status).to.eq(200);
      cy.request({
        method: 'GET',
        url: '/login',
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});
