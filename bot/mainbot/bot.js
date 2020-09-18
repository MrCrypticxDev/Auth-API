const Klasy = require("./klasy-eris");
const path = require("path");
const config = require("../../config.json");
const r = require("../database.js");
const client = new Klasy.Client({
token: config.token,
commandPath: path.join(__dirname, "commands"),
eventPath: path.join(__dirname, "events"),
ownerID: config.bot.mainAdmin,
prefix: config.bot.prefix
}).start();