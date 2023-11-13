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
    static addcourse ({courseName, courseDescription, email, userId}) {
      return this.create({
        courseName:courseName,
        courseDescription:courseDescription,
        email,
        userId,
        })
    };
    static remove({id}) {
      const index = Courses.findIndex(course => course.id === id);
      if (index !== -1) {
        Courses.splice(index, 1);
        return true; // deleted
      } else {
        return false; //failed
      }
    }
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
