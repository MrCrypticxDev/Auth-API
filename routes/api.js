const express = require("express");
const router = express.Router();
const r = require('../modules/database');
const { Canvas } = require('canvas-constructor');
const fsn = require('fs-nextra');
const { get } = require('snekfetch');
const { resolve, join } = require('path');
router.get('/', (req, res, next) => {
res.redirect('/docs/api');
});
router.get('/user/:id', async (req, res) => {
r.table('users').get(req.params.id).without('customcss', 'forceLogout', 'email').run(async (error, user) => {
if (!user) return res.status(404).json({ message: 'Looks like this user is not on our Database!', status: 404 });
res.status(200).json({ status: 200, user })
})
});
router.get('/bot/:id', async (req, res) => {
r.table('bots').get(req.params.id).without('token').run(async (error, bot) => {
if (!bot) return res.status(404).json({ message: 'Looks like this bot is not on our Database!', status: 404 });
res.status(200).json({ status: 200, bot })
})
});
router.post('/bot/:id', async (req, res) => {
const bot = await r.table('bots').get(req.params.id).run();
const header = req.headers['authorization'];
const amount = req.body.count || req.body.server_count || req.body.guild_count;
if (!header || header == '') return res.status(401).json({ message: 'Authorization is required! 👀', status: 401 });
if (!amount || amount == '') return res.status(400).json({ message: 'ServerCount is required! 👀', status: 400, type: 1 });
if (isNaN(amount)) return res.status(400).json({ message: 'The ServerCount must be a vaild number! 😃', status: 400, type: 2 });
if (!bot) return res.status(404).json({ message: 'Looks like this bot is not on our Database!', status: 404 });
if (bot.token != header) return res.status(403).json({ message: 'An invalid authorization token was provided! ❌', status: 403 });
r.table('bots').get(req.params.id).update({ server_count: Number(amount) }).run();
res.status(200).json({ message: 'Okay ServerCount successfully updated! 👌', status: 200 })
})
router.get('/bots/:id', async (req, res) => {
const user = await r.table('users').get(req.params.id).run();
if (!user) return res.status(404).json({ message: 'Looks like this user is not on our Database!', status: 404 });
let bots = await r.table('bots').run();
bots = bots.filter(bot => (req.params.id == bot.owner) || bot.owners.includes(req.params.id));
if (bots.length == 0) return res.status(204).json({ bots: 'Looks like this user doesnt have any bots!', status: 204 });
res.status(200).json({ status: 200, bots: Array.from(bots.map((bot) => bot.id)) })
});
router.get("/bot/:id/widget", (req,res) => {
res.status(501).json({ message: 'This is currently disabled!', status: 501 });
});
router.get('*', (req, res) => {
res.status(404).json({ message: 'This is in invalid API endpoint link (this endpoint does not exist).', status: 404 });
});
module.exports = router; 