const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

class User extends Model {}

User.init({
  // Model attributes are defined here
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING
    // allowNull defaults to true
  },
  email : {
    type : DataTypes.STRING,
    allowNull : false
  },
  password: {
    type : DataTypes.STRING,
    allowNull : false
  },
  id: {
    type : DataTypes.INTEGER,
    allowNull : false,
    primaryKey : true,
    autoIncrement : true
  },
  },
 {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'User' // We need to choose the model name
});
module.exports = User;  
User.sync({ force: true }).then(() => {
  console.log("User table created");
  // Now the `users` table in the database corresponds to the model definition
  return User.create({
    firstName: 'John',
    lastName: 'Hancock',
    email : 'idk@gmail.com',
    password : '12345678',
    id: '1',
  });
});

// the defined model is the class itself
console.log(User === sequelize.models.User); // true