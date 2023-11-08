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
    static getCourses () {
      return this.findAll();
    }
    static associate(models) {
      // define association here 
      Courses.belongsTo(models.Users, {
        foreignKey: "userId",
      });
      Courses.hasMany(models.Chapters, {
        foreignKey: "courseId",
      }); 
      Courses.addcourse = async (courseName, courseDescription, email) => {
        try {
          const course = await Courses.create({
            courseName,
            courseDescription,
            email,
          });
          return course;
        } catch (error) {
          console.error(error);
        }
      };
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
}
