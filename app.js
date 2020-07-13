//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
const session = require('express-session')
const passportLocalMongoose = require('passport-local-mongoose');
const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// var md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const app = express();

// console.log(md5("123456"));


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({
    extended:true
}));

app.use(session({
    secret: "Hipp hiip hopp hopp.",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
});
var Schema = mongoose.Schema;
const userSchema = new Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// const secret = "Thisislittlesecrets.";
// userSchema.plugin(encrypt ,{secret: secret, encryptedFields: ['password'] });
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3003/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

 
app.get("/", (req, res) => {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
    res.render("login");
});



app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", function(req, res) { 
    // if (req.isAuthenticated()) {
    //     res.render("secrets");
    // }else{ 
    //     res.redirect("/login");
    // }
    User.find({"secret": {$ne: null}}, function(error, foundUsers) {
        if (error) {
            console.log(error);
        } else{
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
})
//update the code

app.post("/register", (req, res, next)=>{
    
    // bcrypt.hash(req.body.password, saltRounds, function(error, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         // password: md5(req.body.password),
    //         password: hash
    //     });
    
    //     newUser.save(function(error){
    //         if(error) {
    //             console.log(error);
    //         } else{
    //             res.render("secrets");
    //         }
    //     });
    // });

    User.register({username: req.body.username}, req.body.password, function(error, user){
        if (error) {
            console.log(error);
            res.redirect("/register");
        } else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    })
});

app.post("/login", (req, res, next)=>{

    // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;

    // User.findOne({email: username}, function(err, foundUser){
    //     if (err) {
    //         console.log("This is not valid");
    //     } else{
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password, function(error, result) {
    //                 if (result === true) {
    //                     res.render("secrets");      
    //                 } else{
    //                     console.log("password doesn't match");        
    //                 }
    //             });
    //             // if (foundUser.password === password) {

    //         }
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(error){
        if (error) {
            console.log(error);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    })

});

app.get("/submit", (req, res, next)=>{
    if (req.isAuthenticated()) {
        res.render("submit");
    }else{ 
        res.redirect("/login");
    }
});

app.post("/submit", (req, res, next)=>{
    const submittedSecret = req.body.secret;
    
    //console.log(req.user.id); 
    User.findById(req.user.id, (error, foundUser) =>{
        if (error) {
            console.log(error);
        } else{
            if (foundUser) {
                foundUser.secret =submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                })
            }
        }
    });
});

app.get("/logout", (req, res, next)=>{
    req.logout();
    res.redirect("/login");
})


const port = 3003;
app.listen(port, ()=>{
    console.log(`Surver is running on https://localhost:${port}`);
    
})