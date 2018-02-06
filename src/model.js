'use strict';

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const lockSchema = new Schema({
  name: {
    type: String,
    index: true,
    unique: true
  },
  uid: String,
  created: {
    type: Date,
    default: Date.now,
    expires: 60 * 2 // two min
  }
});

mongoose.model('lock', lockSchema);

exports.lockSchema = lockSchema;
