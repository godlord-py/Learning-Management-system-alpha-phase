
const Sequelize = require("sequelize");
const database = "Capstone-dev";
const username = "postgres";
const password = "Aayush@11";
const sequelize = new Sequelize(database, username, password, {
  host: "localhost",
  dialect: "postgres",
});
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
const connect = async () => {
    return sequelize.authenticate();
  }
  
  module.exports = {
    connect,
    sequelize,
  };