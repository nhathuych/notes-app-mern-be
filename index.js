require('dotenv').config()

const config = require('./config.json')
const mongoose = require('mongoose')

mongoose.connect(config.connectionString)

const User = require('./models/user.model')
const Note = require('./models/note.model')

const express = require('express')
const cors = require('cors')
const app = express()

const jwt = require('jsonwebtoken')
const { authenticateToken, generateAccessToken, getUserFromBearerToken, renderError, renderSuccess } = require('./utilities')

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

// Add a note
app.post('/add-note', async (req, res) => {
  const { title, content, tags } = req.body
  const userInfo = getUserFromBearerToken(req)

  try {
    const note = new Note({ title, content, tags: tags || [], isPinned: false, userId: userInfo._id })
    await note.save()

    renderSuccess(res, note, 'Note created successfully.')
  } catch (error) {
    renderError(res, error.message)
  }
})

// Update a note
app.put('/update-note/:noteId', async (req, res) => {
  const noteId = req.params.noteId
  const { title, content, tags, isPinned } = req.body
  const userInfo = getUserFromBearerToken(req)

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: userInfo._id },  // filter
      { title, content, tags, isPinned },     // attributes want to update
      { new: true, runValidators: true }      // new: true => return a record that has newest(updated) attributes
    )

    if (!note) return renderError(res, 'Note not found.', 404);

    renderSuccess(res, note, 'Note updated successfully.')
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

// Get all notes
app.get('/all-notes', async (req, res) => {
  const userInfo = getUserFromBearerToken(req)

  const notes = await Note.find({ userId: userInfo._id }).sort({ isPinned: -1 })

  renderSuccess(res, notes, 'All notes retrieved successfully.')
})

// Destroy a Note
app.delete('/delete-note/:noteId', async (req, res) => {
  const noteId = req.params.noteId
  const userInfo = getUserFromBearerToken(req)

  try {
    const note = await Note.findOneAndDelete({ _id: noteId, userId: userInfo._id })

    note ? renderSuccess(res, {}, 'Note deleted successfully.') : renderError(res, 'Note not found.', 404)
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

// Switch note isPinned
app.put('/toggle-note-pinned/:noteId', async (req, res) => {
  const noteId = req.params.noteId
  const { isPinned } = req.body
  const userInfo = getUserFromBearerToken(req)

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: userInfo._id },  // filter
      { isPinned },                           // attributes want to update
      { new: true, runValidators: true }      // new: true => return a record that has newest(updated) attributes
    )

    note ? renderSuccess(res, note, 'Note isPinned state toggled successfully.') : renderError(res, 'Note not found.', 404)
  } catch(error) {
    renderError(res, error.message, 500)
  }
})

app.listen(8000)

module.exports = app
