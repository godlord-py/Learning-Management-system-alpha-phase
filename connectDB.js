
const Sequelize = require("sequelize");

const database = "Capstone-dev";
const username = "postgres";
const password = "300678";
const sequelize = new Sequelize(database, username, password, {
  host: "localhost",
  dialect: "postgres",
});

const connect = async () => {
    return sequelize.authenticate();
  }
  
  module.exports = {
    connect,
    sequelize
  }