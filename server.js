var express = require("express");
var app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
require("dotenv").config();

const { Client, Status } = require("@googlemaps/google-maps-services-js");

let port = process.env.PORT || 3000;
const client = new Client({});

/* TODO: 
-Add Morgan for logging 
- Add connect-timeout for iddlwa
*/

//Middleware extension for express
app.use(cors());
app.use(express.json());

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

//CRUD METHODS

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
  console.log(req.params.name);
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
app.get("/", function (req, res) {
  res.send("<h1>Hello World<h1>");
});
app.listen(port, function () {
  console.log(`Example app listening on port !`);
});
