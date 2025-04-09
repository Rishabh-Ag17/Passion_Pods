const express = require("express");
const Router = express.Router();
const catchAsync = require('../utils/catchAsync.js');
const {isLoggedIn, validateUser} = require('../middleware.js');
const users = require('../controllers/users.js');
const multer = require("multer");
const {storage} = require("../cloudinary/index.js");
const upload = multer({storage});

// Users Index Route
Router.get("/", catchAsync(users.index));

// New User Form Route
Router.get("/new", isLoggedIn, users.renderNewForm);

// Create New User
Router.post("/", isLoggedIn, upload.array('image'), validateUser, catchAsync(users.createUser));

// Show User Route
Router.get("/:id", catchAsync(users.showUsers));

// Edit User Form Route
Router.get("/:id/edit", isLoggedIn, catchAsync(users.renderEditForm));

// Update User
Router.put("/:id", isLoggedIn, upload.array('image'), validateUser, catchAsync(users.updateUsers));

// Delete User
Router.delete("/:id", isLoggedIn,  catchAsync(users.deleteUsers));

// Get matchmaking results for a user
Router.get("/:id/matches", isLoggedIn, catchAsync(users.getMatches));

// // GET /users/:id/chat
// Router.get("/:id/chat", (req, res) => {
//   const { id } = req.params;
//   // Render a chat page or return a placeholder
//   res.render("chat/chat", { userId: id });
// });

module.exports = Router;