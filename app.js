//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")

// our app
const app = express();
const port = 3000;
if (port == null || port == "") { port = 3000; }

// app config
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));

// DB Connection
mongoose.connect(
			"mongodb://localhost:27017/userDB", 
			{
				useNewUrlParser: true, 
				useUnifiedTopology: true, 
				useFindAndModify: false
			}
		);

// DB Schema
const userSchema = new mongoose.Schema({
	email: String,
	password: String
});

// Encryption
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

// Modal
const User = new mongoose.model("User", userSchema);

// METHODS
app.get("", function(req, res) {
	res.render("home");
});

app.get("/login", function(req, res) {
	res.render("login");
});

app.post("/login", function(req, res) {
	const username = req.body.username;
	const password = req.body.password;

	User.findOne({email: username}, function(err, foundUser){
		if (!err) {
			if (foundUser) {
				if (foundUser.password === password) {
					res.render("secrets");
				}
			} else {
				res.render("login");
			}
		} else {
			console.log(err);
			res.render("login");
		}
	})
});

app.get("/register", function(req, res) {
	res.render("register");
});

app.post("/register", function(req, res) {
	const newUser = new User({
		email: req.body.username,
		password: req.body.password
	});

	newUser.save(function(err) {
		if(err){
			console.log(err);
		} else {
			res.render("secrets");
		}
	});
});

app.get("/logout", function(req, res) {
	res.render("home");
});

// Listening
app.listen(port, function(){
	console.log("Listening on port " + port);
});

