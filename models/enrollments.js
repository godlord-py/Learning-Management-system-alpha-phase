'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
        Enrollments.belongsTo(models.Users, {
          foreignKey: "userId",
        });
        Enrollments.belongsTo(models.Courses, {
          foreignKey: "courseId",
        });
    }  
  }
  Enrollments.init({
    userId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER,
    chapterId: DataTypes.INTEGER,
    pageId: DataTypes.INTEGER,
    isComplete: DataTypes.BOOLEAN, 
  }, {
    sequelize,
    modelName: 'Enrollments', 
  });
  return Enrollments;
};