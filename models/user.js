const mongoose = require("mongoose");
var crypto = require("crypto");

const UserSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  hash: String,
  salt: String,
});
UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, "sha512")
    .toString("hex");
};
UserSchema.methods.validPassword = function (password) {
  let hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
    .toString(`hex`);
  return this.hash === hash;
};

const User = (module.exports = mongoose.model("User", UserSchema, "Users"));
