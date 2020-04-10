const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect("mongodb://127.0.0.1:27017/VisitorApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
const locationSchema = new Schema({
  address: String,
  locationId: String,
  types: [String]
});
let Location = mongoose.model("Location", locationSchema, "savedLocations");
db.once("open", function() {
  console.log("Connection Successful!");

  let location1 = new Location({
    address: "test1",
    locationId: "test2",
    types: ["he", "llo"]
  });
  Location.find({}, function(err, location) {
    if (err) {
      console.log("Something went wrong");
      throw err;
    }
    console.log(location);
  });
  //   query.exec(function(err, result) {});

  //   location1.save(function(err, location) {
  //     if (err) return console.error(err);
  //     console.log("Successfully Inserted");
  //   });
});
