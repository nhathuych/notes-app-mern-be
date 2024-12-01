require('dotenv').config()

const config = require('./config.json')
const mongoose = require('mongoose')

mongoose.connect(config.connectionString)

const User = require('./models/user.model')
const Note = require('./models/note.model')

const express = require('express')
const cors = require('cors')
const app = express()

const { authenticateToken, generateAccessToken, renderError, renderSuccess } = require('./utilities')

app.use(express.json())

app.use(
  cors({
    origin: '*'
  })
)

app.get('/', (req, res) => {
  res.json({ data: 'Hello Express!' })
})

// Registrator
app.post('/create-user', async (req, res) => {
  const { fullName, email, password } = req.body

  try {
    const user = new User({ fullName, email, password })
    await user.save()

    const accessToken = generateAccessToken(user)

    renderSuccess(res, { ...user._doc, accessToken }, 'Registration Successfull.')
  } catch (error) {
    renderError(res, error.message)
  }
})

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email)    return renderError(res, 'Email is required.')
  if (!password) return renderError(res, 'Password is required.')

  const user = await User.findOne({ email, password })

  if (!user) return renderError(res, 'Invalid email or password.')

  const accessToken = generateAccessToken(user)

  renderSuccess(res, { ...user._doc, accessToken }, 'Login Successfull.')
})

// Get user info from access token
app.get('/get-user', authenticateToken, async (req, res) => {
  const { user } = req.user
  const currentUser = await User.findOne({ _id: user._id })

  currentUser ? renderSuccess(res, currentUser, 'User retrieved successfully.') : renderError(res, 'User not found.')
})

// Add a note
app.post('/add-note', authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body
  const { user } = req.user // retrieved from authenticateToken

  try {
    const note = new Note({ title, content, tags: tags || [], isPinned: false, userId: user._id })
    await note.save()

    renderSuccess(res, note, 'Note created successfully.')
  } catch (error) {
    renderError(res, error.message)
  }
})

// Update a note
app.put('/update-note/:noteId', authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { title, content, tags, isPinned } = req.body
  const { user } = req.user // retrieved from authenticateToken

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },  // filter
      { title, content, tags, isPinned }, // attributes want to update
      { new: true, runValidators: true }  // new: true => return a record that has newest(updated) attributes
    )

    if (!note) return renderError(res, 'Note not found.', 404);

    renderSuccess(res, note, 'Note updated successfully.')
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

// Get all notes
app.get('/all-notes', authenticateToken, async (req, res) => {
  const { user } = req.user // retrieved from authenticateToken

  const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 })

  renderSuccess(res, notes, 'All notes retrieved successfully.')
})

// Destroy a Note
app.delete('/delete-note/:noteId', authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { user } = req.user // retrieved from authenticateToken

  try {
    const note = await Note.findOneAndDelete({ _id: noteId, userId: user._id })

    note ? renderSuccess(res, {}, 'Note deleted successfully.') : renderError(res, 'Note not found.', 404)
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

// Switch note isPinned
app.put('/toggle-note-pinned/:noteId', authenticateToken, async (req, res) => {
  const noteId = req.params.noteId
  const { isPinned } = req.body
  const { user } = req.user // retrieved from authenticateToken

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: user._id },  // filter
      { isPinned },                           // attributes want to update
      { new: true, runValidators: true }      // new: true => return a record that has newest(updated) attributes
    )

    note ? renderSuccess(res, note, 'Note isPinned state toggled successfully.') : renderError(res, 'Note not found.', 404)
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

// Search notes
app.get('/search-notes', authenticateToken, async (req, res) => {
  const { user } = req.user // retrieved from authenticateToken
  let { query } = req.query
  query = query.trim()

  if (query.length == 0) renderError(res, 'Enter your search query.')

  try {
    const notes = await Note.find({
      userId: user._id,
      $or: [
        { title:   { $regex: new RegExp(query, 'i') } },
        { content: { $regex: new RegExp(query, 'i') } }
      ]
    })

    renderSuccess(res, notes, 'Notes retrieved successfully.')
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

app.listen(8000)

module.exports = app
