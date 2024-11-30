const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const authHeader = req.headers('authorization')
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.TOKEN_SECRET_KEY, (error, user) => {
    if (error) {
      return res.sendStatus(401)
    }

    req.user = user

    next()
  })
}

function getUserFromBearerToken(req) {
  if (req.headers && req.headers.authorization) {
    const authorization = req.headers.authorization.split(' ')[1]
    const decoded = jwt.verify(authorization, process.env.TOKEN_SECRET_KEY)
    return decoded['user']
  }

  return null
}

function generateAccessToken(user, expiresIn = '30d') {
  const payload = { user }
  return jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn })
}

function renderError(res, message, code = 400) {
  return res.status(code).json({ error: true, message })
}

function renderSuccess(res, data, message) {
  return res.status(200).json({ error: false, data, message })
}

module.exports = {
  authenticateToken,
  generateAccessToken,
  getUserFromBearerToken,
  renderError,
  renderSuccess,
}
