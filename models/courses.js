'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Courses extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static addcourse (courseName, courseDescription, email) {
      return this.create({
        courseName,
        courseDescription,
        email,
        })
    };
    static getCourses () {
      return this.findAll()
    }
    static associate(models) {
      // define association here 
      Courses.belongsTo(models.Users, {
        foreignKey: "userId",
      });
      Courses.hasMany(models.Chapters, {
        foreignKey: "courseId",
      }); 
    } 
  }

  Courses.init({
    courseName: DataTypes.STRING,
    courseDescription: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Courses',
  });
  return Courses;
};
