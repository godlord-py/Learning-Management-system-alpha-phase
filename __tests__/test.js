const { describe } = require("../Model");
const db = require("../models");

describe("Capstone model", () => {
    beforeAll(async () => {
        await db.sequelize.sync({ force: true });
    });
});
    test("can signup", async () => {
        expect.assertions(1);
        const capstone = await db.capstone.create({
        firstName: "John",
        lastName: "Hancock",
        email : "test@gmail.com",
        id: "1",
    })
});