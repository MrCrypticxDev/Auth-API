const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const logger = require("morgan");
const express = require("express");
const passport = require("passport");
const expressip = require("express-ip");
const requestIp = require("request-ip");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const rateLimit = require("express-rate-limit-json");
require("./bot/backupbot");
const config = require("./config.json");
const client = require("./bot/mainbot");
require("./modules/featured");
const r = require("./modules/database");
const app = express();
const server = http.createServer(app);
const user = require("./modules/user");
const apiRateLimit = rateLimit({
windowMs: 1 * 60 * 1000,
max: 30,
message: "Looks like you are sending to many requets, You may only send 30 requests every minute per IP Address."
});
app.enable("trust proxy");
app.set("views", path.join(__dirname, "views/templates"));
app.set("view engine", "ejs");
app.set("view options", {pretty: true});
app.locals.pretty = app.get("env") === 'development'
app.use(requestIp.mw());
app.use(expressip().getIpInfoMiddleware);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
res.locals.user = req.user;
next();
});
app.use(cookieSession({
secret: settings.secret,
maxAge: 1000 * 60 * 60 * 24 * 7
}));
app.use(cookieParser(settings.secret));
app.use(passport.initialize());
app.use(passport.session());
app.use("/", require("./routes/index"));
app.use("/bots", require("./routes/bots"));
app.use("/user", require("./routes/user"));
app.use("/api", apiRateLimit, require("./routes/api"));
app.use("/auth", require("./routes/auth"));
app.use("/docs", require("./routes/docs"));
app.use("/staff", require("./routes/staff"));
app.use(user.configure);
app.use((req, res, next) => {
next(createError(404));
});