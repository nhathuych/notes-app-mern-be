const mongoose = require('mongoose')
const Schema = mongoose.Schema
const User = require('./user.model')

const noteSchema = new Schema({
  userId:    { type: String, required: true },
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  isPinned:  { type: Boolean, default: false },
  tags:      { type: [String], default: [] },
  createdAt: { type: Date, default: new Date().getTime() }
})

noteSchema.pre('save', async function(next) {
  const userExists = await User.exists({ _id: this.userId })

  if (!userExists) return next(new Error(`User with ID ${this.userId} does not exist!`))

  next()
})

module.exports = mongoose.model("Note", noteSchema)
