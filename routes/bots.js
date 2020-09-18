const express = require("express");
const router = express.Router();
const r = require(`../modules/database.js`);
const user = require("../modules/user");
const request = require("request");
const config = require("../config.json");
const client = require("../bot/backupbot.js");
const crypto = require("crypto");
const reasons = require("../modules/data/reasons.json");
const marked = require("marked");
const cheerio = require("cheerio");
const forceLogout = require('../modules/forceLogout');
const updateIP = require('../modules/updateIP');
router.get("*", user.configure, (req, res, next) => {
if (!req.user) {
next();
} else {
updateIP.run(req);
next();
}
});
var musicTag;
var economyTag;
var utilityTag;
var modTag;
var funTag;
const perm = (level) =>
async (req, res, next) => {
forceLogout.check(req, res);
const getBot = await r.table("bots").get(req.params.id || req.body.id).run();
if (!getBot) {
res.status(404).render("error", { title: "Error:", status: 404, message: 'Looks like this bot is not on our Database!'});
} else if ((level <= 3 && req.user.admin) || (level <= 2 && req.user.admin || req.user.mod) || (level <= 1 && getBot.owners.includes(req.user.id) || getBot.owner === req.user.id)) {
next();
} else {
res.status(400).render("error", { title: "Error:", status: 400, message: 'Well you can\'t edit other people\'s bots can you?' });
}
};
const clean = (html) => {
const $ = cheerio.load(html);
$("*").each((i, element) => {
Object.keys(element.attribs)
.filter(attribute => attribute.startsWith("on"))
.forEach((attribute) => {
$(element).removeAttr(attribute);
});
});
$("script").remove();
$("object").remove();
return $.html();
};
router.get("/add", user.configure, user.auth, user.inServer, (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
const libraries = await r.table("libraries").run();
res.render("bots/add", { title: "Add Bot:", libraries })
}
});
});
router.post("/add", user.configure, user.auth, user.inServer, async (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
let checkBot = await r.table("bots").get(req.body.client_id).run();
if (checkBot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Well it looks like you have a bot listed on the site!'});
let invite;
if (req.body.invite === '') {
invite = `https://discord.com/oauth2/authorize?client_id=${req.body.client_id}&scope=bot`
} else {
if (typeof req.body.invite !== "string") {
res.status(400).render("error", { title: "Error:", status: 400, message: 'You provided an invalid invite, Please try again!'})
} else if (req.body.invite.length > 2000) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Then invite you provided was invaild or to long, Please try again!'})
} else if (!/^https?:\/\//.test(req.body.invite)) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The invite must have HTTP or HTTPS, Please try again!'});
} else {
invite = req.body.invite
}
}
request({
uri: `https://discord.com/api/users/${req.body.client_id}`,
method: "GET",
headers: {
'User-Agent': config.useragent,
Authorization: `Bot ${config.token}`
},
json: true
}, (err, response, discordResponse) => {
if (req.body.client_id.length > 32) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The bot ID has must not be greater then 32 numbers, This is because of Discords ID!'})
} else if (req.body.owners.length > 200) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Sadly you can\'t have more then 5 Owners, Please try again!'})
} else if (discordResponse.message === "Unknown User") {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Your bot doesn\'t exist on Discord, or does it! 👀'})
} else if (!discordResponse.bot) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Sadly you cannot add other users to the list!'})
} else if (discordResponse.bot === true){
let owners;
if (req.body.owners === '') {
owners = []
} else {
owners = [...new Set(req.body.owners.split(/\D+/g))]
}
r.table("libraries").get(req.body.library).run(async (error, libexist) => {
if (!libexist) {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = "Other";
r.table("bots").insert({
id: req.body.client_id,
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: invite,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owner: req.user.id,
nsfw: req.body.nsfw,
owners: owners,
approved: false,
verified: false,
featured: false,
pendingVerification: false,
server_count: 0,
token: crypto.randomBytes(64).toString("hex"),
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run();
r.table("bots_backup").get(req.body.client_id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x7a66db,
title: `😊 **__Bot has been added to the site:__**`,
description: `👀 <@${req.user.id}> has added: <@${req.body.client_id}> to the site!`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay great, thanks for adding your bot to the site, One of our Website Moderation Team will take a look soon. Please make sure that you are in the discord server!'})
} else {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = "Other";
r.table("bots").insert({
id: req.body.client_id,
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: invite,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owner: req.user.id,
nsfw: req.body.nsfw,
owners: owners,
approved: false,
verified: false,
featured: false,
server_count: 0,
token: crypto.randomBytes(64).toString("hex"),
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run();
r.table("bots_backup").get(req.body.client_id).delete().run();
client.createMessage(config.channels.weblogs, {
embed: {
color: 0x36393F,
title: `😊 **__Bot has been added to the site:__**`,
description: `👀 <@${req.user.id}> has added: <@${req.body.client_id}> to the site!`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay great, thanks for adding your bot to the site, One of our Website Moderation Team will take a look soon. Please make sure that you are in the discord server!'})
}
});
} else {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Your bot doesn\'t exist on Discord, or does it! 👀'})
}
})
}
})
});
router.get("/verification", user.configure, user.auth, user.inServer, (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
const bots = await r.table("bots").filter({ owner: req.user.id }).run();
res.render("staff/applications/verificationForm", { title: "Verification:", bots });
}
});
});
router.post("/verification", user.configure, user.auth, user.inServer, async (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
const checkBot = await r.table("bots").get(req.body.bot).run();
const checkApp = await r.table("verification_apps").get(req.body.bot).run();
if (!checkBot || checkBot.owner != req.user.id) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Err you don\'t own that bot sorry!'});
if (checkApp) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Looks like you have already applied this bot for Certified Bots!'});
r.table("verification_apps").insert({
id: req.body.bot,
user: req.user.id,
server_count: req.body.server_count,
online: req.body.online,
original_code: req.body.original_code,
features: req.body.features,
website: req.body.website
}).run();
r.table("bots").get(req.body.bot).update({ pendingVerification: true }).run();
const verifLog = await client.createMessage(config.channels.verification_log, {
embed: {
color: 0x43f5ce,
fields: [
{
name: "Bot / Owner",
value: "<@" + req.body.bot + "> / <@" + req.user.id + ">"
},
{
name: "Does your bot post server count to our API?",
value: req.body.server_count
},
{
name: "Is your bot online 24/7 other than short maintenance?",
value: req.body.online
},
{
name: "Is your bot original code and not a fork of another bot?",
value: req.body.original_code
},
{
name: "What is your bot's main feature?",
value: req.body.features
}
],
}
});
client.createMessage(config.channels.weblog, {
embed: {
color: 0x36393F,
title: `😎 **__New bot applied to become a Certified Bots:__**`,
description: `👀 <@${req.user.id}> has applied: <@${req.body.bot}> to become a Certified Bots!`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay great, thanks for adding your bot to the site, One of our Website Moderation Team will take a look soon. Please make sure that you are in the discord server!'})
}
});
});
router.get("/:id/delete", user.configure, user.auth, perm(1), (req, res, next) => {
forceLogout.check(req, res);
res.render("bots/delete", { title: 'Remove Bot:'})
});
router.post("/:id/delete", user.configure, user.auth, perm(1), (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
r.table("bots_backup").insert({
id: req.params.id,
name: req.body.username,
avatar: req.body.avatar,
prefix: req.body.prefix,
library: req.body.library,
invite: req.body.invite,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owner: req.user.id,
nsfw: req.body.nsfw,
owners: req.body.owners,
approved: false,
verified: false,
server_count: bot.server_count,
token: bot.token,
remove_time: Date.now() + 1209600000,
tags: {
"music": req.body.tags.music,
"economy": req.body.tags.economy,
"utility": req.body.tags.utility,
"mod": req.body.tags.mod,
"fun": req.body.tags.fun
}
}).run();
let owners = bot.owners;
owners.unshift(bot.owner);
let botDevs = owners.map((dev) => {
return '<@' + dev + '>'
}).join(", ");
if (client.guilds.get(config.guildID).members.find(u => u.id === bot.id)) {
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).kick(`Removed Bot By: ${req.user.username}! 🔨`);
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't work here i can't kick ${bot.name}!`);
}
}
r.table("bots").get(req.params.id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0xfcba03,
title: `👌 **__Bot Removed:__**`,
description: `👀 <@${req.user.id}> has removed: <@${bot.id}> from the site!`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: '😃 Awesome i have now removed the bot from the site!'});
})
});
router.get("/:id/token", user.configure, user.auth, perm(1), (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
res.render("bots/token", { title: "Bot Token:", bot })
})
});
router.get("/:id/edit", user.configure, user.auth, perm(1), (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
const libraries = await r.table("libraries").without(bot.library).run();
res.render("bots/edit", { title: "Edit Bot:", libraries, owners: bot.owners ? bot.owners.join(" ") : '', bot })
})
});
router.post("/:id/edit", user.configure, user.auth, perm(1), async (req, res, next) => {
forceLogout.check(req, res);
if (req.body.owners.length > 200) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Sadly you can\'t have more then 5 Owners, Please try again!'});
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (typeof req.body.invite !== "string") {
res.status(400).render("error", { title: "Error:", status: 400, message: 'You provided an invalid invite, Please try again!'})
} else if (req.body.invite.length > 2000) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Then invite you provided was invaild or to long, Please try again!'})
} else if (!/^https?:\/\//.test(req.body.invite)) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The invite must have HTTP or HTTPS, Please try again!' });
} else if (!req.body.invite.startsWith("https://discord.com/") ){
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The invite url is invailed, It has to use: https://discord.com/.' });
}
let owners;
client.createMessage(config.channels.err_log, `❌ Something didn't work here i can't kick ${bot.name}!`);
if (req.body.owners === '') {
owners = []
} else {
owners = [...new Set(req.body.owners.split(/\D+/g))]
}
request({
uri: `https://discord.com/api/users/${req.params.id}`,
method: "GET",
headers: {
'User-Agent': config.useragent,
Authorization: `Bot ${config.token}`
},
json: true
}, (err, response, discordResponse) => {
r.table("libraries").get(req.body.library).run(async (error, libexist) => {
if (!libexist) {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = "Other";
r.table("bots").get(req.params.id).update({
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: req.body.invite,
nsfw: req.body.nsfw,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owners: owners,
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run(async (error, update) => {
if (update.unchanged) {
res.status(400).render("error", { title: "Error:", status: 400, message: '😅 Looks like i have nothning to update!'});
} else {
let owners = bot.owners;
owners.unshift(bot.owner);
let botDevs = owners.map((dev) => {
let userTag = client.users.get(dev);
if (!userTag) return 'Unknown#0000';
return userTag.tag
}).join(", ");
client.createMessage(config.channels.weblog, {
embed: {
color: 0x8ab6ee,
title: `🤔 **__Looks like a bot has been edited:__**`,
description: `👀 <@${req.user.id}> has edited there bot: <@${req.params.id}>.`
}
});
res.redirect("/bots/" + req.params.id);
}
})
} else {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = req.body.library;
r.table("bots").get(req.params.id).update({
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: req.body.invite,
nsfw: req.body.nsfw,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owners: owners,
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run(async (error, update) => {
if (update.unchanged) {
res.status(400).render("error", { title: "Error:", status: 400, message: '😅 Looks like i have nothning to update!'});
} else {
let owners = bot.owners;
owners.unshift(bot.owner);
let botDevs = owners.map((dev) => {
let userTag = client.users.get(dev);
if (!userTag) return 'Unknown#0000';
return userTag.tag
}).join(", ");
client.createMessage(config.channels.weblog, {
embed: {
color: 0x8ab6ee,
title: `🤔 **__Looks like a bot has been edited:__**`,
description: `👀 <@${req.user.id}> has edited there bot: <@${req.params.id}>.`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay well it looks like your bot has been updated! 😎'});
}
})
}
});
})})
});
router.get("/resubmit/:id", user.configure, user.auth, user.inServer, (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!'})
} else {
r.table("bots_backup").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Looks like this bot is not on our Database!'});
if (bot.owner != req.user.id) return res.status(400).render("error", { title: "Error:", status: 400, message: 'You are not the owner of that bot.'});
const libraries = await r.table("libraries").without(bot.library).run();
res.render("bots/resubmit", { title: "Resubmit:", libraries, bot, owners: bot.owners ? bot.owners.join(" ") : "" })
})
}
});
});
router.get("/resubmit/:id/delete", user.configure, user.auth, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots_backup").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Looks like this bot is not on our Database!'});
if (bot.owner != req.user.id) return res.status(400).render("error", { title: "Error:", status: 400, message: 'You are not the owner of that bot tut tut!'});
r.table("bots_backup").get(req.params.id).delete().run();
res.status(400).render("error", { title: "Success:", status: 200, message: 'Okay i have removed the bot.'})
})
});
router.post("/resubmit/:id", user.configure, user.auth, user.inServer, async (req, res, next) => {
forceLogout.check(req, res);
r.table("users").get(req.user.id).run(async (error, user) => {
if (user.isBanned) {
res.status(403).render("error", { title: "Error:", status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!'})
} else {
r.table("bots_backup").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Looks like this bot is not on our Database!'});
if (bot.owner != req.user.id) return res.status(400).render("error", { title: "Error", status: 400, message: 'You are not the owner of that bot tut tut!'});
let checkBot = await r.table("bots").get(req.params.id);
if (checkBot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'The bot has already been added to the site!'});
let invite;
if (req.body.invite === '') {
invite = `https://discord.com/oauth2/authorize?client_id=${req.params.id}&scope=bot`
} else {
if (typeof req.body.invite !== "string") {
res.status(400).render("error", { title: "Error:", status: 400, message: 'You provided an invalid invite, Please try again!'})
} else if (req.body.invite.length > 2000) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Then invite you provided was invaild or to long, Please try again!'})
} else if (!/^https?:\/\//.test(req.body.invite)) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The invite must have HTTP or HTTPS, Please try again!'});
} else {
invite = req.body.invite
}
}
request({
uri: `https://discord.com/api/users/${req.params.id}`,
method: "GET",
headers: {
'User-Agent': config.useragent,
Authorization: `Bot ${config.token}`
},
json: true
}, (err, response, discordResponse) => {
if (req.params.id.length > 32) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'The bot ID has must not be greater then 32 numbers, This is because of Discords ID!'})
} else if (req.body.owners.length > 200) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Sadly you can\'t have more then 5 Owners, Please try again!'})
} else if (discordResponse.message === "Unknown User") {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Your bot doesn\'t exist on Discord, or does it! 👀'})
} else if (!discordResponse.bot) {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Sadly you cannot add other users to the list!'})
} else if (discordResponse.bot === true){
let owners;
if (req.body.owners === '') {
owners = []
} else {
owners = [...new Set(req.body.owners.split(/\D+/g))]
}
r.table("libraries").get(req.body.library).run(async (error, libExist) => {
if (!libExist) {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = "Other";
r.table("bots").insert({
id: req.body.client_id,
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: invite,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owner: req.user.id,
nsfw: req.body.nsfw,
owners: owners,
approved: false,
verified: false,
featured: false,
pendingVerification: false,
server_count: 0,
token: crypto.randomBytes(64).toString("hex"),
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run();
r.table("bots_backup").get(req.params.id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0xee4747,
title: `😉 **__Bot has been resubmitted to the site:__** `,
description: `👀 <@${req.user.id}> has resubmitted there bot: <@${req.params.id}>.`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay great, thanks for readding your bot to the site, One of our Website Moderation Team will take a look soon. Please make sure that you are in the discord server!'})
} else {
musicTag = req.body.music === "on";
economyTag = req.body.economy === "on";
utilityTag = req.body.utility === "on";
modTag = req.body.mod === "on";
funTag = req.body.fun === "on";
const library = req.body.library;
r.table("bots").insert({
id: req.params.id,
name: discordResponse.username,
avatar: discordResponse.avatar,
prefix: req.body.prefix,
library: library,
invite: invite,
short_desc: req.body.short_desc,
long_desc: req.body.long_desc,
support_server: req.body.support,
github: req.body.github,
website: req.body.website,
owner: req.user.id,
nsfw: req.body.nsfw,
owners: owners,
approved: false,
verified: false,
server_count: bot.server_count,
token: bot.token,
tags: {
"music": musicTag,
"economy": economyTag,
"utility": utilityTag,
"mod": modTag,
"fun": funTag
}
}).run();
r.table("bots_backup").get(req.params.id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0xee4747,
title: `😉 **__Bot has been resubmitted to the site:__** `,
description: `👀 <@${req.user.id}> has resubmitted there bot: <@${req.params.id}>.`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay great, thanks for readding your bot to the site, One of our Website Moderation Team will take a look soon. Please make sure that you are in the discord server!'})
}
});
} else {
return res.status(400).render("error", { title: "Error:", status: 400, message: 'Your bot doesn\'t exist on Discord, or does it! 👀'})
}
})
})
}
});
});
router.get("/:id/approve", user.configure, user.auth, user.mod, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error", status: 400, message: 'Your bot doesn\'t exist on Discord, or does it! 👀'});
if (bot.approved === true) return res.status(400).render("error", { title: "Error", status: 400, message: '⚠ This bot has already been approved!'});
let owners = bot.owners;
owners.unshift(bot.owner);
owners.map(async (dev) => {
try {
await client.guilds.get(config.guildID).members.find(u => u.id === dev).addRole(config.roles.dev, "Okay developer was approved & given the it's roles!")
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't add the roles!`);
}
});
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).roles.addRole(config.roles.botsapproved, "Okay bot was approved on the site & added it's roles!")
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't add the roles!`);
}
try {
await client.guilds.get(config.staffGuildID).members.find(u => u.id === bot.id).roles.removeRole(config.roles.queuebots, "❌ This bot hasn't been approved on the site *yet*!")
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't add the roles!`);
}
let botDevs = owners.map((dev) => {
return `<@${dev}>`;
}).join(", ");
r.table("bots").get(req.params.id).update({ approved: true }).run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x4287f5,
title: `😊 **__Bot was accepted:__**`,
description: `👀 Okay <@${bot.id}> was just accepted by: <@${req.user.id}>.`
}
});
if (client.guilds.get(config.staffGuildID).members.find(u => u.id === bot.id)) return res.status(200).render("error", { title: "Success:", status: 200, message: '😎 Bot was accepted!'});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay so you accpeted this bot, Please invite to to the main server!'});
})
});
router.get("/:id/verify", user.configure, user.auth, user.admin, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
if (bot.approved === false) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay so you need to accepted this before we go into the verification!'});
if (bot.verified === true) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay this bot is already verified!'});
const app = r.table("verification_app").get(req.params.id).run();
if (app) {
r.table("verification_app").get(req.params.id).delete().run();
r.table("bots").get(req.params.id).update({ pendingVerification: false }).run();
}
let owners = bot.owners;
owners.unshift(bot.owner);
owners.map(async (dev) => {
try {
await client.guilds.get(config.guildID).members.find(u => u.id === dev).addRole(config.roles.certifiedev, "Okay so this user already have the Certified Developers on the site!")
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't add the roles!`);
}
});
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).addRole(config.roles.certifiedbots, "Okay this bot is verified on the site!")
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't add the roles!`);
}
let botDevs = owners.map((dev) => {
r.table("users").get(dev).run(async (error, user) => {
if (user) {
r.table("users").get(dev).update({ isVerifiedDev: true }).run();
}
});
let userTag = client.users.get(dev);
if (!userTag) return 'Unknown#0000';
return userTag.tag;
}).join(", ");
r.table("bots").get(req.params.id).update({ verified: true }).run();
r.table("verification_apps").get(req.params.id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0xec93ed,
title: `😁 **__Bot has been accepted to be a Certified Bots:__**`,
description: `👀 Okay <@${bot.id}> was accepted to be a Certified Bots by: <@${req.user.id}>.`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Awesome Welcome to the Certified Bots role!'});
})
});
router.get("/:id/unverify", user.configure, user.auth, user.admin, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
if (bot.approved === false) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay so you need to accepted this before we go into the verification!'});
if (bot.verified === false) {
const application = await r.table("verification_apps").get(req.params.id).run();
if (!application) {
res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay to it looks like there is not pending application!'});
} else {
r.table("verification_apps").get(req.params.id).delete().run();
r.table("bots").get(req.params.id).update({ pendingVerification: false }).run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x62a2a6,
title: `🤨 **__Bot verification applications was rejected:__**`,
description: `👀 Okay <@${req.user.id}> didn't accept: <@${bot.id}>, To join the Certified Bots please get in contact with the Website Administration team.`
}
});
res.status(400).render("error", { title: "Yikes:", status: 200, message: "Sorry, Please re apply soon!"});
}
}
res.render("staff/unverify", { title: "Unverify Bot:", bot })
})
});
router.post("/:id/unverify", user.configure, user.auth, user.admin, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
if (bot.approved === false) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay so you need to accepted this before we go into the verification!'});
if (bot.verified === false) {
const application = await r.table("verification_apps").get(req.params.id).run();
if (!application) {
res.status(400).render("error", { title: "Error:", status: 400, message: 'Okay to it looks like there is not pending application!'});
} else {
r.table("verification_apps").get(req.params.id).delete().run();
r.table("bots").get(req.params.id).update({ pendingVerification: false }).run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x62a2a6,
title: `🤨 **__Bot verification applications was rejected:__**`,
description: `👀 Okay <@${req.user.id}> didn't accept: <@${bot.id}>, To join the Certified Bots please get in contact with the Website Administration team.`
}
});
res.status(400).render("error", { title: "Yikes:", status: 200, message: "Sorry, Please re apply soon!"});  
}
}
let owners = bot.owners;
owners.unshift(bot.owner);
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).roles.remove(config.roles.certifiedbots)
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't remove the role!`);
}
let botDevs = owners.map((dev) => {
let userTag = client.users.get(dev);
if (!userTag) return 'Unknown#0000';
return userTag.tag;
}).join(", ");
r.table("bots").get(req.params.id).update({ verified: false }).run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x36393F,
title: `⚠ **__Bot was unverified:__**`,
description: `👀 Okay <@${bot.id}> was unverified by: <@${req.user.id}> for the reason of \`${req.body.reason}\`.`
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Okay i have removed the bot & developers roles from the server & site!'});
})
});
router.get("/:id/remove", user.configure, user.auth, user.mod, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
res.render("staff/remove", { title: 'Remove Bot:'});
})
});
router.post("/:id/remove", user.configure, user.auth, user.mod, (req, res, next) => {
forceLogout.check(req, res);
r.table("bots").get(req.params.id).run(async (error, bot) => {
if (!bot) return res.status(400).render("error", { title: "Error:", status: 400, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
r.table("bots_backup").insert({
id: bot.id,
name: bot.username,
avatar: bot.avatar,
prefix: bot.prefix,
library: bot.library,
invite: bot.invite,
short_desc: bot.short_desc,
long_desc: bot.long_desc,
support_server: bot.support,
github: bot.github,
website: bot.website,
owner: bot.owner,
owners: bot.owners,
server_count: bot.server_count,
token: bot.token,
remove_time: Date.now() + 1209600000,
tags: {
"music": bot.tags.music,
"economy": bot.tags.economy,
"utility": bot.tags.utility,
"mod": bot.tags.mod,
"fun": bot.tags.fun
}
}).run();
let owners = bot.owners;
owners.unshift(bot.owner);
let botDevs = owners.map((dev) => {
return '<@' + dev + '>'
}).join(", ");
if (bot.approved === true) {
if (client.guilds.get(config.guildID).members.find(u => u.id === bot.id)) {
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).kick(`🔨 Kicked: Bot was removed by: ${req.user.username}.`);
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't kick it!`);
}
}
r.table("bots").get(req.params.id).delete().run();
client.createMessage(config.channels.weblog, {
embed: {
color: 0x6269a6,
title: `❌ **__Bot was removed:__**`,
description: `👀 <@${bot.id}>, got removed by: <@${req.user.id}>, Reason: \`${req.body.reason}\`\n\nOther Info:\`\`\`${req.body.extra}\`\`\``
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Awesome bot has now been removed!'});
} else {
if (client.guilds.get(config.guildID).members.find(u => u.id === bot.id)) {
try {
await client.guilds.get(config.guildID).members.find(u => u.id === bot.id).kick(`🔨 Kicked: Bot was removed by: ${req.user.username}.`);
} catch(e) {
client.createMessage(config.channels.err_log, `❌ Something didn't look right: ${bot.name}. As i can't kick it!`);
}
}
r.table("bots").get(req.params.id).delete().run();
client.createMessage(settings.channels.weblog, {
embed: {
color: 0x8e62a6,
title: `🤨 **__Bot was declined:__**`,
description: `👀 Okay <@${req.user.id}>, Declined: <@${bot.id}>, Reason: \`${req.body.reason}\`\n\nOther Info:\`\`\`${req.body.extra}\`\`\``
}
});
res.status(200).render("error", { title: "Success:", status: 200, message: 'Awesome the bot was declined!'});
}
})
});
router.get("/:id", user.configure, async (req, res, next) => {
forceLogout.check(req, res);
const botexists = await r.table("bots").get(req.params.id).run();
if (!botexists) return res.status(404).render("error", { title: "Error:", status: 404, message: 'Bot doesn\'t seem to exist on Discord, or does it!'});
const bot = await r.table("bots").get(req.params.id).merge(bot => ({
ownerinfo: bot("owners")
.default([])
.append(bot("owner"))
.map(id => r.table("users").get(id))
.default({ username: "Unknown", tag: 'Unknown#0000'})
})).run();
if (!bot) return res.status(404).render("error", { title: "Error:", status: 404, message: 'Bot doesn\'t seem to exist on Discord, or does it!' });
let desc = '';
desc = marked(bot.long_desc);
const staffServer = config.staffGuildID;
const mainServer = config.guildID;
res.render("bots/view", { title: bot.name, bot, desc, staffServer, mainServer })
});
module.exports = router;