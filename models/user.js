'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
     static async login(params) {
      return  await User.create(params);
    }
    static associate(models) {
      // define association here
    }
}
  User.init({
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    id: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
