const express = require("express");
const router = express.Router();
const passport = require("passport");
const axios = require("axios");
const session  = require("cookie-session");
const Strategy = require("passport-discord").Strategy;
const config = require("../config.json");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const r = require("../modules/database");
var scopes = ['identify'];
passport.use(new Strategy({
clientID: config.clientID,
clientSecret: config.clientSecret,
callbackURL: config.callbackURL,
scope: scopes
}, function(accessToken, refreshToken, profile, done) {
process.nextTick(function() {
return done(null, profile);
});
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
extended: true
}));
router.get("/", passport.authenticate("discord"));
router.get("/login", (req, res, next) => {
res.redirect("/auth/");
});
router.get("/info", (req, res, next) => {
res.json(req.user)
});
router.get("/callback", passport.authenticate("discord", {
}), (req, res, next) => {
r.table("users").get(req.user.id).run(async (error, user) => {
if (!user) {
if (req.user.id === config.allAdmin) {
r.table("users").insert({
id: req.user.id,
username: req.user.username,
website: "",
github: "",
gitlab: "",
twitter: "",
customcss: "",
tag: req.user.username + "#" + req.user.discriminator,
avatar: req.user.avatar,
isCertifiedDev: true,
isWebsiteMod: true,
isWebsiteAdmin: true,
isBanned: false
}).run();
res.cookie('fl_helper-Rank', 'admin');
} else {
r.table("users").insert({
id: req.user.id,
username: req.user.username,
website: "",
github: "",
gitlab: "",
twitter: "",
customcss: "",
tag: req.user.username + "#" + req.user.discriminator,
avatar: req.user.avatar,
isCertifiedDev: true,
isWebsiteMod: true,
isWebsiteAdmin: true,
isBanned: false
}).run();
res.cookie('fl_helper-Rank', 'user');
}
} else {
r.table("users").get(req.user.id).update({
username: req.user.username,
tag: req.user.username + "#" + req.user.discriminator,
avatar: req.user.avatar
}).run();
const ui = await r.table("users").get(req.user.id).run();
if (ui.isAdmin === true) {
res.cookie('fl_helper-Rank', 'admin');
} else if (ui.isMod === true) {
res.cookie('fl_helper-Rank', 'mod');
} else {
res.cookie('fl_helper-Rank', 'user');
}
console.log(req.query.code);
await res.redirect("/")
}
})
});
router.get("/logout", (req, res) => {
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!'})
} else {
req.logout();
res.clearCookie('fl_helper-Rank');
res.redirect("/");
}
})
});
router.get("/forceLogout", async (req, res, next) => {
await req.logout();
await res.clearCookie('fl_helper-Rank');
res.redirect("/auth/login");
});
module.exports = router;