'use strict';
const { request } = require('express');
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chapters extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static addchapters ({chapterName, chapterDescription,courseId}) {
      return this.create({
        chapterName:chapterName,
        chapterDescription:chapterDescription,
        })
    };
    static getChapters() {
      return this.findAll()
    }
    static associate(models) {
      // define association here
      Chapters.belongsTo(models.Courses, {
        foreignKey: "courseId",
      }); 
      Chapters.hasMany(models.Pages, {
        foreignKey: "chapterId",
      });
    }
  }
  Chapters.init({
    chapterName: DataTypes.STRING,
    chapterDescription: DataTypes.TEXT,
    courseId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Chapters',
  });
  return Chapters;
};