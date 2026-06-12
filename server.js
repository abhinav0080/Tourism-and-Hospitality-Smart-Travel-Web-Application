const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    
    // Create tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS flight_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      return_date TEXT,
      passengers INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS hotel_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      hotel_name TEXT NOT NULL,
      location TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      guests INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Routes
// User Authentication
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
  db.run(query, [username, password, email], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, username, message: 'User registered successfully' });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.get(query, [username, password], (err, user) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ id: user.id, username: user.username, message: 'Login successful' });
  });
});

// Flight Bookings
app.post('/api/flights/book', (req, res) => {
  const { user_id, from_location, to_location, departure_date, return_date, passengers } = req.body;
  
  const query = 'INSERT INTO flight_bookings (user_id, from_location, to_location, departure_date, return_date, passengers) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(query, [user_id, from_location, to_location, departure_date, return_date, passengers], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Flight booked successfully' });
  });
});

app.get('/api/flights/user/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const query = 'SELECT * FROM flight_bookings WHERE user_id = ? ORDER BY created_at DESC';
  db.all(query, [userId], (err, bookings) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(bookings);
  });
});

// Hotel Bookings
app.post('/api/hotels/book', (req, res) => {
  const { user_id, hotel_name, location, check_in_date, check_out_date, guests } = req.body;
  
  const query = 'INSERT INTO hotel_bookings (user_id, hotel_name, location, check_in_date, check_out_date, guests) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(query, [user_id, hotel_name, location, check_in_date, check_out_date, guests], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Hotel booked successfully' });
  });
});

app.get('/api/hotels/user/:userId', (req, res) => {
  const userId = req.params.userId;
  
  const query = 'SELECT * FROM hotel_bookings WHERE user_id = ? ORDER BY created_at DESC';
  db.all(query, [userId], (err, bookings) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(bookings);
  });
});

// Contact Form
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const query = 'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)';
  db.run(query, [name, email, message], function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, message: 'Message sent successfully' });
  });
});

// Sample data for hotels
app.get('/api/hotels/list', (req, res) => {
  const hotels = [
    {
      id: 1,
      name: 'Taj Palace',
      location: 'New Delhi',
      price: 12500,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 2,
      name: 'Leela Palace',
      location: 'Udaipur',
      price: 18000,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 3,
      name: 'Wildflower Hall',
      location: 'Shimla',
      price: 15000,
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 4,
      name: 'Taj Mahal Palace',
      location: 'Mumbai',
      price: 16500,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1596386461350-326ccb383e9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 5,
      name: 'Kumarakom Lake Resort',
      location: 'Kerala',
      price: 14000,
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1580977276076-ae4b8c219b8e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 6,
      name: 'Oberoi Amarvilas',
      location: 'Agra',
      price: 19500,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 7,
      name: 'Rambagh Palace',
      location: 'Jaipur',
      price: 17500,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    },
    {
      id: 8,
      name: 'Taj Falaknuma Palace',
      location: 'Hyderabad',
      price: 18500,
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    }
  ];
  
  res.json(hotels);
});

// Sample data for flights
app.get('/api/flights/destinations', (req, res) => {
  const destinations = [
    { id: 1, city: 'Delhi', country: 'India', code: 'DEL' },
    { id: 2, city: 'Mumbai', country: 'India', code: 'BOM' },
    { id: 3, city: 'Bangalore', country: 'India', code: 'BLR' },
    { id: 4, city: 'Chennai', country: 'India', code: 'MAA' },
    { id: 5, city: 'Kolkata', country: 'India', code: 'CCU' },
    { id: 6, city: 'Hyderabad', country: 'India', code: 'HYD' },
    { id: 7, city: 'Jaipur', country: 'India', code: 'JAI' },
    { id: 8, city: 'Goa', country: 'India', code: 'GOI' },
    { id: 9, city: 'Kochi', country: 'India', code: 'COK' },
    { id: 10, city: 'Varanasi', country: 'India', code: 'VNS' },
    { id: 11, city: 'Amritsar', country: 'India', code: 'ATQ' },
    { id: 12, city: 'Ahmedabad', country: 'India', code: 'AMD' }
  ];
  
  res.json(destinations);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Close the database connection when the server is terminated
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});