const express = require('express')                 // Import Express (web framework for Node)
const app = express()                              // Create an Express application instance
const cors = require('cors')                       // Import CORS middleware (allow cross-origin requests)
require('dotenv').config()                         // Load environment variables from .env
const mongoose = require('mongoose')               // Import Mongoose (MongoDB ODM)

// ---------- Global Middleware ----------
app.use(cors())                                    // Enable CORS for all routes
app.use(express.static('public'))                  // Serve static files from /public (e.g., index.html, CSS)
app.use(express.json())                            // Parse JSON bodies (application/json)
app.use(express.urlencoded({ extended: true }))    // Parse URL-encoded bodies (HTML forms)

// ---------- Database Connection ----------
mongoose.connect(process.env.MONGO_URI, {          // Connect to MongoDB using MONGO_URI from .env
  useNewUrlParser: true,                           // Use new URL parser
  useUnifiedTopology: true                         // Use new Server Discover & Monitoring engine
})

// ---------- Mongoose Schemas & Models ----------
const userSchema = new mongoose.Schema({           // Define the User schema (shape of user docs)
  username: { type: String, required: true }       // username is a required string
})

const exerciseSchema = new mongoose.Schema({       // Define the Exercise schema (shape of exercise docs)
  userId: { type: String, required: true },        // Which user this exercise belongs to (store their _id)
  description: String,                             // What the exercise is
  duration: Number,                                // Duration in minutes
  date: String                                     // Stored as a formatted string (e.g., "Mon Jan 01 1990")
})

const User = mongoose.model('User', userSchema)    // Create the User model (collection: users)
const Exercise = mongoose.model('Exercise', exerciseSchema) // Create the Exercise model (collection: exercises)

// ---------- Routes ----------

// Home route (for FCC starter UI & basic check)
app.get('/', (req, res) => {                       // When GET / is requested…
  res.sendFile(__dirname + '/views/index.html')    // Send the file /views/index.html
})

// Create a new user
app.post('/api/users', async (req, res) => {       // When POST /api/users is requested…
  try {
    const newUser = new User({                     // Create a new User document
      username: req.body.username                  // Read username from request body
    })
    await newUser.save()                           // Save user to MongoDB
    res.json({                                     // Respond with the expected FCC shape
      username: newUser.username,                  // username
      _id: newUser._id                             // MongoDB generated id
    })
  } catch (err) {
    res.status(500).json({ error: 'Error creating user' }) // Basic error handling
  }
})

// Get all users
app.get('/api/users', async (req, res) => {        // When GET /api/users is requested…
  const users = await User.find({})                // Find all user documents
  res.json(users)                                  // Return array of users (each with username and _id)
})

// Add an exercise to a specific user
app.post('/api/users/:_id/exercises', async (req, res) => { // When POST /api/users/:_id/exercises…
  try {
    const { description, duration, date } = req.body // Read exercise fields from request body
    const user = await User.findById(req.params._id) // Find the user by URL param :_id

    if (!user) return res.json({ error: 'User not found' }) // Guard: invalid user id

    const exercise = new Exercise({                   // Create a new Exercise document
      userId: user._id.toString(),                    // Link exercise to the user
      description,                                    // Save description
      duration: Number(duration),                     // Ensure duration is a Number
      date: date                                      // If date provided…
        ? new Date(date).toDateString()               // …format it like "Mon Jan 01 1990"
        : new Date().toDateString()                   // …otherwise use today in same format
    })

    await exercise.save()                              // Save exercise to MongoDB

    res.json({                                         // Respond in FCC’s expected shape
      username: user.username,                         // username of that user
      description: exercise.description,               // the exercise description
      duration: exercise.duration,                     // the duration number
      date: exercise.date,                             // formatted date string
      _id: user._id                                    // the user’s _id (NOT the exercise id)
    })
  } catch (err) {
    res.status(500).json({ error: 'Error adding exercise' }) // Basic error handling
  }
})

// Get a user’s exercise logs (optionally filtered)
app.get('/api/users/:_id/logs', async (req, res) => { // When GET /api/users/:_id/logs…
  try {
    const { from, to, limit } = req.query             // Optional query params ?from&to&limit
    const user = await User.findById(req.params._id)  // Find user by :_id

    if (!user) return res.json({ error: 'User not found' }) // Guard: invalid user id

    let exercises = await Exercise.find({ userId: user._id.toString() }) // Get all exercises for user

    // Date filtering (converted to Date objects for comparisons)
    if (from) {
      const fromDate = new Date(from)                 // Parse ?from=YYYY-MM-DD (or any Date-parsable string)
      exercises = exercises.filter(e => new Date(e.date) >= fromDate)
    }
    if (to) {
      const toDate = new Date(to)                     // Parse ?to=YYYY-MM-DD
      exercises = exercises.filter(e => new Date(e.date) <= toDate)
    }

    // Limit results (return only the first N after filtering)
    if (limit) {
      exercises = exercises.slice(0, Number(limit))
    }

    res.json({                                        // Respond in FCC’s expected log shape
      username: user.username,                        // username
      count: exercises.length,                        // number of exercises returned
      _id: user._id,                                  // user id
      log: exercises.map(e => ({                      // map exercises to minimal fields FCC expects
        description: e.description,
        duration: e.duration,
        date: e.date                                  // already stored as toDateString()
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Error fetching logs' }) // Basic error handling
  }
})

// ---------- Server Listener ----------
const listener = app.listen(process.env.PORT || 3000, () => { // Start the HTTP server
  console.log('Your app is listening on port ' + listener.address().port) // Log which port we’re on
})
