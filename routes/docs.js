const express = require("express");
const router = express.Router();
const user = require("../modules/user");
const forceLogout = require('../modules/forceLogout');
router.get("/", user.configure, (req, res, next) => {
res.redirect("https://docs.localhost:8080");
});
router.get("/api", user.configure, (req, res, next) => {
res.redirect("https://docs.localhost:8080/api");
});
router.get("/verification", user.configure, (req, res) => {
res.redirect("https://docs.localhost:8080/info/verification");
});
router.get("/staff", user.configure, (req, res) => {
res.redirect("https://docs.localhost:8080/info/staff");
});
router.get("/license", user.configure, (req, res, next) => {
forceLogout.check(req, res);
res.render("docs/license", { title: 'Licenses:' })
});
router.get("/privacypolicy", user.configure, (req, res, next) => {
forceLogout.check(req, res);
res.render("docs/policy", { title: 'Privacy Policy:' })
});
router.get("/termsofuse", user.configure, (req, res, next) => {
forceLogout.check(req, res);
res.render("docs/terms", { title: 'Terms of Service:' })
});
module.exports = router
