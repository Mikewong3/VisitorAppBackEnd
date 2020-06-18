var express = require("express");
var app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// require("dotenv").config();
const slowDown = require("express-slow-down");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { Client, Status } = require("@googlemaps/google-maps-services-js");
const User = require("./models/user");
const crypto = require("crypto");
let port = process.env.PORT || 3000;
const client = new Client({});
const speedLimiter = slowDown({
  windowMs: 10 * 60 * 1000, // 10 minutes
  delayAfter: 30, // allow 100 requests per 10 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 100:
});

/* TODO: 
-Add Morgan for logging 
- Add connect-timeout for iddlwa
*/

//Middleware extension for express
app.use(cors());
app.use(express.json());
app.use(speedLimiter);
app.use(passport.initialize());
app.use(passport.session());
//This is setting up the connection to mongodb
mongoose.connect(process.env.DB_LINK, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
mongoose.set("useFindAndModify", false);
//SCHEMAS FOR MONGODB **Put in seperate files later****
const locationSchema = new Schema({
  name: String,
  address: String,
  phone: String,
  locationId: String,
  rating: Number,
  website: String,
  types: [String],
  geoCordinates: [],
  visited: Boolean,
});
let Location = mongoose.model("Location", locationSchema, "savedLocations");
//Passport Authentication Setup
passport.use(
  new LocalStrategy(function (username, password, done) {
    User.findOne({ email: username }, function (err, user) {
      if (user === null) {
        return done("user does not exist", false);
      } else {
        if (user.validPassword(password)) {
          return done(null, username);
        } else {
          return done("Unauthorized access", false);
        }
      }
    });
  })
);
//Look this up
passport.serializeUser(function (user, done) {
  if (user) done(null, user);
});

passport.deserializeUser(function (id, done) {
  done(null, id);
});

//Middleware for Passport Authentication
const auth = () => {
  return (req, res, next) => {
    passport.authenticate("local", (error, user, info) => {
      if (error) res.status(400).json({ statusCode: 200, message: error });
      console.log("--FROM AUTH MIDDLEWARE--" + user);
      req.logIn(user, function (error) {
        if (error) return next(error);
        next();
      });
    })(req, res, next);
  };
};
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log("--isLoggedIn is Working");
    return next();
  }
  return res
    .status(400)
    .json({ statusCode: 400, message: "Not authenticated" });
};

//CRUD METHODS

app.post("/register", function (req, res) {
  User.findOne({ email: req.body.email }, function (err, user) {
    if (user != null) {
      return res.status(409).send({ message: "User already exist" });
    } else {
      let newUser = new User();
      newUser.email = req.body.email;
      newUser.setPassword(req.body.password);
      newUser.save((err, User) => {
        if (err) {
          return res.status(400).send({ message: "Failed to add user" });
        } else {
          return res.status(201).send({
            message: "User added successfully",
          });
        }
      });
    }
  });
});

app.post("/authenticate", auth(), (req, res) => {
  console.log("--FROM AUTHENTICATE ROUTE---" + req.user);
  res
    .status(200)
    .json({ statusCode: 200, message: "User is authroized", user: req.user });
});

//This is for retrieving all the saved Locations
app.get("/getLocations", function (req, res) {
  Location.find({}, function (err, result) {
    if (err) {
      throw err;
    }
    res.json(result);
  });
});

//This is for getting the placeID of a specific location
app.get("/locations/:name", function (req, res) {
  client
    .findPlaceFromText({
      params: {
        key: process.env.GOOGLE_API_LINK,
        input: req.params.name,
        inputtype: "textquery",
        locationbias: "",
      },
    })
    .then((resp) => {
      if (resp.data.status === Status.OK) {
        console.log(resp.data.candidates);
        res.send(resp.data.candidates);
      } else {
        console.log(resp.data.error_message);
      }
    })
    .catch((e) => {
      console.log(e);
    });
});
//This is for getting google details of a certain location
app.get("/getDetails/:locationId", function (req, res) {
  client
    .placeDetails({
      params: {
        key: process.env.GOOGLE_API_LINK,
        place_id: req.params.locationId,
        fields: [
          "formatted_address",
          "place_id",
          "geometry",
          "rating",
          "formatted_phone_number",
          "types",
          "website",
        ],
      },
    })
    .then((resp) => {
      console.log(resp);
      res.send(resp.data.result);
    });
});
//This is for getting autocomplete locations of a searched text
app.get("/autocomplete/:name", function (req, res) {
  client
    .placeAutocomplete({
      params: {
        key: process.env.GOOGLE_API_LINK,
        input: req.params.name,
      },
    })
    .then((resp) => {
      console.log(resp.data.predictions);
      res.send(resp.data.predictions);
    })
    .catch((error) => {
      console.log(error);
    });
});
//This is for posting a location to mongoDB
//Need to fix the geolocation method; make it cleaner
app.post("/saveLocation", function (req, res) {
  res.send(req.body);
  console.log(req.body);
  let geoCords = [];

  geoCords.push(req.body.lat);
  geoCords.push(req.body.lng);
  let saveLocation = new Location({
    name: req.body.name,
    address: req.body.address,
    phone: req.body.phone,
    locationId: req.body.locationId,
    types: req.body.types,
    rating: req.body.rating,
    website: req.body.website,
    geoCordinates: geoCords,
    visited: req.body.visited,
  });
  saveLocation.save(function (err, location) {
    if (err) return console.error(err);
    console.log("Successfully Inserted");
  });
});
app.delete("/deleteLocation/:locationId", function (req, res) {
  const id = req.params.locationId;
  Location.deleteOne({ locationId: id }, function (err) {
    if (err) console.log(err);
    console.log("Success Deletion");
    res.send({ data: "Successful Deletion" });
  });
});
app.put("/visited/:locationId", function (req, res) {
  const id = req.params.locationId;
  console.log(id);
  const status = !req.body.status;
  console.log(status);

  Location.findOneAndUpdate({ locationId: id }, { visited: status }, function (
    err,
    result
  ) {
    if (err) {
      res.send(err);
    } else {
      console.log("----Put Result-----");
      res.send(result);
    }
  });
});

app.listen(port, function () {
  console.log(`Example app listening on port !` + port);
});
