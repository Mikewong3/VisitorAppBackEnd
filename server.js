var express = require("express");
var app = express();
var cors = require("cors");
let api = require("./config");
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Client = require("@googlemaps/google-maps-services-js").Client;

const client = new Client({});

/* TODO: 
-Add long and lat for the locations when posting them into mongoDB
-Add Morgan for logging 
- Add connect-timeout for iddlwa
*/
//***REMEBER TO HIDE MY KEY OR PEOPLE STEAL BAD****

//Middleware extension for express
app.use(cors());
app.use(express.json());

//This is setting up the connection to mongodb
mongoose.connect("mongodb://127.0.0.1:27017/VisitorApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
let db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

//SCHEMAS FOR MONGODB **Put in seperate files later****
const locationSchema = new Schema({
  address: String,
  locationId: String,
  types: [String],
  geoCordinates: []
});
let Location = mongoose.model("Location", locationSchema, "savedLocations");

//CRUD METHODS

//This is for retrieving all the saved Locations
app.get("/getLocations", function(req, res) {
  Location.find({}, function(err, result) {
    if (err) {
      throw err;
    }
    res.json(result);
  });
});

//This is for getting the placeID of a specific location
app.get("/locations/:name", function(req, res) {
  console.log(req.params.name);
  client
    .findPlaceFromText({
      params: {
        key: api.googleApiKey.apiKey,
        input: req.params.name,
        inputtype: "textquery"
      }
    })
    .then(resp => {
      console.log(resp.data.candidates);
      res.send(resp.data.candidates);
    })
    .catch(e => {
      console.log(e);
    });
});
//This is for getting google details of a certain location
app.get("/getDetails", function(req, res) {
  client
    .placeDetails({
      params: {
        key: api.googleApiKey.apiKey,
        place_id: "ChIJDZQ0SReRwokR7Qev4OIC_vg",
        fields: ["formatted_address", "place_id"]
      }
    })
    .then(resp => {
      console.log(resp);
      res.send(resp.data);
    });
});
//This is for getting autocomplete locations of a searched text
app.get("/autocomplete/:name", function(req, res) {
  client
    .placeAutocomplete({
      params: {
        key: api.googleApiKey.apiKey,
        input: req.params.name
      }
    })
    .then(resp => {
      console.log(resp.data.predictions);
      res.send(resp.data.predictions);
    })
    .catch(error => {
      console.log(error);
    });
});
//This is for posting a location to mongoDB
//Need to fix the geolocation method; make it cleaner
app.post("/saveLocation", function(req, res) {
  res.send(req.body);
  let geoCords = [];

  client
    .geocode({
      params: {
        key: api.googleApiKey.apiKey,
        address: req.body.address
      }
    })
    .then(resp => {
      let saveLocation = new Location({
        address: req.body.address,
        locationId: req.body.locationId,
        types: req.body.types,
        geoCordinates: geoCords
      });
      saveLocation.geoCordinates = resp.data.results[0].geometry.location;
      saveLocation.save(function(err, location) {
        if (err) {
          return console.error(err);
        }
        console.log("Successfully Inserted");
      });
    })
    .catch(err => {
      console.log(err);
    });
});
app.listen(3000);
