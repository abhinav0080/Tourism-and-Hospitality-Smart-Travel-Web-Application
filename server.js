const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('node:crypto');
const path = require('node:path');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 5001);
const db = new sqlite3.Database(process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite'));
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('hotel', 'flight')),
    title TEXT NOT NULL, destination TEXT NOT NULL, start_date TEXT NOT NULL,
    end_date TEXT, people INTEGER NOT NULL CHECK(people BETWEEN 1 AND 10),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id))`);
});
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '32kb' }));
const query = (sql, params=[]) => new Promise((resolve,reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const run = (sql, params=[]) => new Promise((resolve,reject) =>
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this.lastID); }));
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET missing: sessions expire on restart. Configure it before deployment.');
const sign = value => crypto.createHmac('sha256',secret).update(value).digest('base64url');
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({sub:user.id,exp:Date.now()+86400000})).toString('base64url');
  return payload+'.'+sign(payload);
}
function auth(req,res,next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /,'');
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return res.status(401).json({error:'Sign in required'});
    const expected = sign(payload);
    if (signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      return res.status(401).json({error:'Invalid session'});
    const data = JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if (!Number.isSafeInteger(data.sub) || Date.now() > data.exp)
      return res.status(401).json({error:'Session expired'});
    req.userId = data.sub;
    next();
  } catch { res.status(401).json({error:'Invalid session'}); }
}
const clean = value => typeof value === 'string' ? value.trim() : '';
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
const safe = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
app.get('/api/health', (_req,res) => res.json({status:'ok'}));
app.post('/api/register', safe(async (req,res) => {
  const username=clean(req.body.username), email=clean(req.body.email).toLowerCase();
  const password=req.body.password;
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password!=='string' || password.length<10 || password.length>128)
    return res.status(400).json({error:'Use a 3–30 character username, valid email and password of 10–128 characters.'});
  const salt=crypto.randomBytes(16).toString('hex');
  const hash=salt+':'+crypto.scryptSync(password,salt,64).toString('hex');
  try {
    const id=await run('INSERT INTO users(username,email,password_hash) VALUES(?,?,?)',[username,email,hash]);
    res.status(201).json({token:makeToken({id}),user:{id,username,email}});
  } catch(e) {
    if (e.code==='SQLITE_CONSTRAINT') return res.status(409).json({error:'Username or email already exists'});
    throw e;
  }
}));
app.post('/api/login', safe(async (req,res) => {
  const username=clean(req.body.username), password=req.body.password;
  if (!username || typeof password!=='string') return res.status(400).json({error:'Credentials required'});
  const [user]=await query('SELECT * FROM users WHERE username=?',[username]);
  // Only password hashes are accepted; historical plaintext accounts require re-registration.
  if (!user || !user.password_hash || !user.password_hash.includes(':'))
    return res.status(401).json({error:'Invalid credentials'});
  const [salt,expected]=user.password_hash.split(':');
  const actual=crypto.scryptSync(password,salt,64);
  const saved=Buffer.from(expected,'hex');
  if (actual.length!==saved.length || !crypto.timingSafeEqual(actual,saved))
    return res.status(401).json({error:'Invalid credentials'});
  res.json({token:makeToken(user),user:{id:user.id,username:user.username,email:user.email}});
}));
app.get('/api/me',auth,safe(async(req,res)=>{
  const [user]=await query('SELECT id,username,email FROM users WHERE id=?',[req.userId]);
  if(!user) return res.status(401).json({error:'Account unavailable'});
  res.json(user);
}));
const hotels=[
  {id:1,name:'Delhi Heritage Stay',location:'New Delhi',price:6500},
  {id:2,name:'Lakeview Retreat',location:'Udaipur',price:8200},
  {id:3,name:'Himalayan Hideaway',location:'Shimla',price:7000},
  {id:4,name:'Coastal Escape',location:'Goa',price:7800}
];
const destinations=['Delhi','Mumbai','Bengaluru','Chennai','Kolkata','Hyderabad','Jaipur','Goa','Kochi','Varanasi'].map((city,i)=>({id:i+1,city,country:'India'}));
app.get('/api/hotels/list',(_req,res)=>res.json(hotels));
app.get('/api/flights/destinations',(_req,res)=>res.json(destinations));
app.get('/api/bookings',auth,safe(async(req,res)=>{
  res.json(await query('SELECT id,type,title,destination,start_date,end_date,people,created_at FROM bookings WHERE user_id=? ORDER BY id DESC',[req.userId]));
}));
app.post('/api/bookings',auth,safe(async(req,res)=>{
  const {type,people,start_date,end_date}=req.body;
  const title=clean(req.body.title),destination=clean(req.body.destination);
  if (!['hotel','flight'].includes(type) || !title || title.length>120 ||
      !destination || destination.length>120 || !Number.isInteger(people) || people<1 || people>10 ||
      !validDate(start_date) || (end_date && (!validDate(end_date) || end_date<start_date)))
    return res.status(400).json({error:'Provide valid trip details and dates.'});
  const id=await run('INSERT INTO bookings(user_id,type,title,destination,start_date,end_date,people) VALUES(?,?,?,?,?,?,?)',
    [req.userId,type,title,destination,start_date,end_date||null,people]);
  res.status(201).json({id,message:'Demo booking saved. No payment or external reservation was made.'});
}));
app.delete('/api/bookings/:id',auth,safe(async(req,res)=>{
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error:'Invalid booking ID'});
  await run('DELETE FROM bookings WHERE id=? AND user_id=?',[Number(req.params.id),req.userId]);
  res.status(204).end();
}));
app.use((err,_req,res,_next)=>{
  console.error(err);
  res.status(500).json({error:'Unexpected server error'});
});
if (require.main===module) app.listen(port,()=>console.log('API listening on '+port));
module.exports=app;
