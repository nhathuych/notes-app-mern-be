require('dotenv').config()

const config = require('./config.json')
const mongoose = require('mongoose')

mongoose.connect(config.connectionString)

const User = require('./models/user.model')

const express = require('express')
const cors = require('cors')
const app = express()

const jwt = require('jsonwebtoken')
const { authenticateToken } = require('./utilities')

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

  if (!email)    return renderError('Email is required.')
  if (!fullName) return renderError('Full name is required.')
  if (!password) return renderError('Password is required.')

  const isUserExisted = await User.findOne({ email })

  if (isUserExisted) return renderError('Email has already been taken.')

  const user = new User({ fullName, email, password })
  await user.save()

  const accessToken = generateAccessToken(user)

  return res.json({
    error: false,
    user,
    accessToken,
    message: 'Registration Successfull.'
  })
})

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email)    return renderError('Email is required.')
  if (!password) return renderError('Password is required.')

  const user = await User.findOne({ email, password })

  if (!user) return renderError('Invalid email or password.')

  const accessToken = generateAccessToken(user)

  return res.json({
    error: false,
    user,
    accessToken,
    message: 'Login Successfull.'
  })
})

const generateAccessToken = (user, expiresIn = '36000m') => {
  const payload = { user }
  return jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn })
}

const renderError = (message, code = 400) => {
  return res.status(code).json({ error: true, message })
}

app.listen(8000)

module.exports = app
