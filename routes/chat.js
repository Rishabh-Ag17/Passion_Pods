const express = require("express");
const Router = express.Router();
const catchAsync = require('../utils/catchAsync.js');
const {isLoggedIn, validateUser} = require('../middleware.js');
const users = require('../controllers/users.js');

//Chat with a user
Router.get('/:userId', isLoggedIn, catchAsync(users.chat));

module.exports = Router; 
  