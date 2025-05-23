if (process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const ExpressError = require('./utils/ExpressError.js');
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const Profile = require("./models/profile.js");
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
require('./utils/socket')(io); 

const profileRoutes = require("./routes/profile.js");
const usersRoutes = require("./routes/users.js");
const reviewsRoutes = require("./routes/review.js");
const chatRoutes = require('./routes/chat.js');

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB connected!"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine('ejs', ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
    secret: 'Hello, @ PassionPods',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7,
    }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Profile.authenticate()));

passport.serializeUser(Profile.serializeUser());
passport.deserializeUser(Profile.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success') || "";
    res.locals.error = req.flash('error') || "";
    next();
});

app.use('/', profileRoutes);
app.use('/users',usersRoutes);
app.use('/users/:id/reviews',reviewsRoutes);
app.use('/chat', chatRoutes);

// Home Route
app.get("/", (req, res) => {
    res.render("home");
});


app.all('*', (req,res,next)=>{
    next(new ExpressError("Page Not Found!", 404));
})

app.use((err, req, res, next) => {
    const {statusCode = 500, message} = err;
    if(!err.message)err.message = "Oh No!! Something Went Wrong!";
    res.status(statusCode).render('error', {err}); 
})

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}!`);
});

// app.listen(5000, () => {
//     console.log("Serving on PORT 5000!");
// });

module.exports = { app, server, io };