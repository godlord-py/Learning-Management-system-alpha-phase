'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static userCourses (userId) {
      return this.findAll({
        where: {
          userId,
        },
        include: ["userCourses"],
      });
    }
    static associate(models) {
      // define association here
      Users.hasMany(models.Courses, {
        foreignKey: "userId",
      });
      Users.hasMany(models.Enrollments, {
        foreignKey: "userId",
      });
    }
  }
  Users.init({
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Users',
  });
  return Users;
};