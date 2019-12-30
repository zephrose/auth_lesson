//jshint esversion:6
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate")
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// our app
const app = express();
const port = 3000;
if (port == null || port == "") { port = 3000; }

// app config
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));

// Session
app.use(session({
	secret: "Dogs Run Home With Their Tails Between Their Legs",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// DB Connection
mongoose.connect(
			"mongodb://localhost:27017/userDB", 
			{
				useNewUrlParser: true, 
				useUnifiedTopology: true, 
				useFindAndModify: false
			}
		);
mongoose.set("useCreateIndex", true);

// DB Schema
const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,
	secret: String
});

// Plugins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Modal
const User = new mongoose.model("User", userSchema);

// Passport Strategies
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new GoogleStrategy({
		clientID: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		callbackURL: "http://localhost:3000/auth/google/secrets",
		userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
	},
	function(accessToken, refreshToken, profile, cb) {
		User.findOrCreate({ googleId: profile.id }, function (err, user) {
			return cb(err, user);
		});
	}
));

// METHODS
app.get("", function(req, res) {
	res.render("home");
});

// OAuth 2.0 *Note the Callbacks*
app.get("/auth/google", 
	passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
	passport.authenticate("google", { failureRedirect: "/login" }),
	function(req, res) {
		// Successful authentication, redirect home.
		res.redirect("/secrets");
	}
);

app.get("/login", function(req, res) {
	res.render("login");
});

app.get("/register", function(req, res) {
	res.render("register");
});

app.post("/login", function(req, res) {
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err) {
		if (err){
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
		}
	});
});

app.post("/register", function(req, res) {
	User.register({username: req.body.username, active: false}, req.body.password, function(err, user) {
		if (err) {
			console.log(err);
			res.redirect("/register");
		} else {
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets")
			});
		}
	});
});

app.get("/logout", function(req, res) {
	req.logout();
	res.redirect("/");
});

app.get("/secrets", function(req, res) {
	User.find({"secret": {$ne: null}}, function(err, foundUser) {
		if (!err) {
			res.render("secrets", {usersWithSecrets: foundUser});
		} else {
			console.log(err);
		}
	});
});

app.get("/submit", function(req, res) {
	if (req.isAuthenticated()){
		res.render("submit");
	} else {
		res.redirect("/login");
	}	
});

app.post("/submit", function(req, res) {
	const subSecret = req.body.secret;
	
	User.findById(req.user.id, function(err, foundUser) {
		if (!err) {
			if (foundUser) {
				foundUser.secret = subSecret;
				foundUser.save(function() {
					res.redirect("/secrets");
				});
			}
		} else {
			console.log(err)
		}
	});
});

// Listening
app.listen(port, function(){
	console.log("Listening on port " + port);
});

