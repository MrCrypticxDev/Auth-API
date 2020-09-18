const express = require('express');
const router = express.Router();
const r = require('../modules/database');
const user = require('../modules/user');
const chunk = require('chunk');
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
const perm = (level) =>
async (req, res, next) => {
const getUser = await r.table('users').get(req.params.id || req.body.id).run();
if (!getUser) {
res.status(404).render('error', { title: 'Error:', status: 404, message: 'Looks like the user is not on our Database!' });
} else if ((level <= 3 && req.user.admin) || (level <= 2 && req.user.admin || req.user.mod) || (level <= 1 && getUser.id == req.user.id)) {
next();
} else {
res.status(400).render('error', { title: 'Error:', status: 401, message: 'Right so can not edit someone else\s profile.' });
}
};
router.get('/:id', user.configure, async (req, res, next) => {
forceLogout.check(req, res);
const getUser = await r.table('users').get(req.params.id).run();
if (!getUser) return res.status(404).render('error', { title: 'Error', status: 404, message: 'Looks like the user is not on our Database!'});
r.table('bots')
.merge(bot => ({
ownerinfo: bot('owners')
.default([])
.append(bot('owner'))
.map(id => r.table('users').get(id))
.default({ username: 'Unknown', tag: 'Unknown#0000' })
}))
.run(async (error, bots) => {
r.table('bots_backup')
.merge(bot => ({
ownerinfo: bot('owners')
.default([])
.append(bot('owner'))
.map(id => r.table('users').get(id))
.default({ username: 'Unknown', tag: 'Unknown#0000' })
}))
.filter({ owner: req.params.id }).run(async (error, bots_backup) => {
bots = bots.filter(bot => (req.params.id == bot.owner) || bot.owners.includes(req.params.id));
const botChunk = chunk(bots, 3);
const storedChunk = chunk(bots_backup, 3);
res.render('users/profile', { title: getUser.tag, botsData: bots, botChunk, userInfo: getUser, storedBotsData: bots_backup, storedChunk })
})
})
});
router.get('/:id/edit', user.configure, user.auth, perm(1), async (req, res, next) => {
forceLogout.check(req, res);
r.table('users').get(req.user.id).run(async (error, user) => {
if (user.isBanned == true) {
res.status(403).render('error', { title: 'Error:', status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
const getUser = await r.table('users').get(req.params.id).run();
res.render('users/edit', { title: 'Edit Profile:', getUser });
}
})
});
router.post('/:id/edit', user.configure, user.auth, perm(1), async (req, res, next) => {
forceLogout.check(req, res);
r.table('users').get(req.user.id).run(async (error, user) => {
if (user.isBanned == true) {
res.status(403).render('error', { title: 'Error:', status: 403, message: 'It looks like you are banned, Please contact one of the Website Administration for help!' })
} else {
if (req.body.bio > 200) {
return res.status(413).render('error', { title: 'Error:', status: 413, message: 'Bio is to long it must only contation 200 characters.' })
}
const getUser = await r.table('users').get(req.params.id).run();
const update = await r.table('users').get(req.params.id).update({
bio: req.body.bio.replace(/<(script|object|blockquote)[\s\S]*?>[\s\S]*?<\/(script|object|blockquote)>/,"").replace(/(href|src)=('|"|`)javascript:.*('|"|`)/,""),
customcss: req.body.customcss,
website: req.body.website,
twitter: req.body.twitter,
github: req.body.github,
gitlab: req.body.gitlab
}).run();
res.redirect(`/user/${req.params.id}`);
}
})
});
module.exports = router;