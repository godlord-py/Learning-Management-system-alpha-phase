'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static setCompletionStatus(bool) {
      return this.update({ isComplete: bool });
    }
    static addPage({ head, info, chapterId }) {
      return this.create({ head, info, chapterId });
    }
    static associate(models) {
      // define association here
      Pages.belongsTo(models.Chapters, {
        foreignKey: "chapterId",
      });
      Pages.belongsToMany(models.Users, {
        through: models.Enrollments,
        foreignKey: "pageId",
      });
    }
  }
  Pages.init({
    head: DataTypes.STRING,
    info: DataTypes.TEXT, 
    chapterId: DataTypes.INTEGER,
    isComplete: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Pages',
  });
  return Pages;
};