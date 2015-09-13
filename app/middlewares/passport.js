let passport = require('passport')
let nodeifyit = require('nodeifyit')
let LocalStrategy = require('passport-local').Strategy
let User = require('../models/user')
let util = require('util')
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
    require('songbird')

function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))



  async function authCB(req, token, _ignored_, account) {
    console.log(account.id)
    if(req.user){

    }
    else{

    }
      // 1. Load user from store
      // 2. If req.user exists, we're authorizing (connecting an account)
      // 2a. Ensure it's not associated with another account
      // 2b. Link account
      // 3. If not, we're authenticating (logging in)
      // 3a. If user exists, we're logging in via the 3rd party account
      // 3b. Otherwise create a user associated with the 3rd party account
  }
}



function configure(config) {


  passport.serializeUser(nodeifyit(async (user) => user._id))
  passport.deserializeUser(nodeifyit(async (id) => {
    console.log("deserializ called")
    let user = await User.promise.findById(id)
    console.log("User object in desrialize "+user)
    return user
  }))

  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'linkedin')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'facebook')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'google')
  // useExternalPassportStrategy(LinkedInStrategy, {...}, 'twitter')
  // passport.use('local-login', new LocalStrategy({...}, (req, email, password, callback) => {...}))
  // passport.use('local-signup', new LocalStrategy({...}, (req, email, password, callback) => {...}))

  passport.use(new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'username',

    failureFlash: true
  }, nodeifyit(async (username, password) => {
    let user

    let email ="";
    if(username.indexOf('@') > -1){
      email = username.toLowerCase()
      user = await User.promise.findOne({email: email})
    }
    else{
      let regexp = new RegExp(username,'i')
      user = await User.promise.findOne({username: {$regex: regexp}})
    }


    if (!user || (email === "" && username !== user.username) || (email !== "" && username !==  user.email)) {
      return [false, {message: 'Invalid username'}]
    }

    if (!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }
    return user
  }, {spread: true})))

  passport.use('local-signup', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    passwordField: 'password',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {
    console.log(" Email in signup stratgey "+email)
    email = (email || '').toLowerCase()
    // Is the email taken?
    if (await User.promise.findOne({email})) {
      return [false, {message: 'That email is already taken.'}]
    }





    // create the user
    let user = new User()
    user.local.email = email

    // Use a password hash instead of plain-text
    user.local.password = password
    try{
      return await user.save()
    }
    catch (e){
      console.log(util.inspect(e))
      return [false, {message: e.message}]
    }

  }, {spread: true})))



  useExternalPassportStrategy(FacebookStrategy, {
    clientID: config.facebook.consumerKey,
    clientSecret: config.facebook.consumerSecret,
    callbackURL: config.facebook.callbackUrl
  }, 'facebook')

  useExternalPassportStrategy(TwitterStrategy, {
    consumerKey: config.twitter.consumerKey,
    consumerSecret: config.twitter.consumerSecret,
    callbackURL: config.twitter.callbackUrl
  }, 'twitter')


  return passport
}





module.exports = {passport, configure}
