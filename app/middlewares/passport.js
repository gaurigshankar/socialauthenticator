let passport = require('passport')
let nodeifyit = require('nodeifyit')
let LocalStrategy = require('passport-local').Strategy
let User = require('../models/user')
let util = require('util')
let _ = require('lodash')
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
    require('songbird')

function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))

  let socialNetworkType = field;

  async function authCB(req, token, _ignored_, account) {
    console.log(account.id)

    let userId = account.id;
    let query ={}
    if(socialNetworkType === 'facebook'){
      query['facebook.id'] = userId
    }
    else if(socialNetworkType === 'twitter'){
      query['twitter.id'] = userId
    }
    else if(socialNetworkType === 'google'){
      query['google.id'] = userId
    }
    else{
      throw Error('Invalid Social Network type')
    }

  let user ;
    if(req && req.user){
      user = req.user
    }
    else{
      user = await User.promise.findOne(query)
      if(!user){
        user = new User({})
      }
    }
    console.log("account.displayName :: "+account.displayName)
    console.log("account.username :: "+account.username)
    console.log("account.ignored  :: "+_ignored_)
  console.log("socialNetworkType :: "+socialNetworkType)

    if(socialNetworkType === 'facebook'){
      let email = !_.isEmpty(account.emails) ? account.emails[0].value : "not found"
      user.facebook = {
          id:userId,
          token : token,
          secret: _ignored_,
         email: email,
          name: account.displayName
      }
    }

    if(socialNetworkType === 'twitter'){
      console.log("Am i here?***************************************")
      user.twitter = {
        id: userId,
        token: token,
        secret: _ignored_,
        displayName: account.displayName,
        userName: account.username
      }
    }
    console.log("Auth Callback Account info :: "+JSON.stringify(user.twitter))
    return await user.save()
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


  passport.serializeUser(nodeifyit(async (user) => user.id))
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

  passport.use('local-login',new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async (email, password) => {
    let user


    user = await User.promise.findOne({'local.email' : email})



    if (!user || user.local.email !== email) {
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
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {
    console.log(" Email in signup stratgey "+email)
    email = (email || '').toLowerCase()
    // Is the email taken?
    if (await User.promise.findOne({'local.email' : email})) {
      return [false, {message: 'That email is already taken.'}]
    }





    // create the user
    let user = new User()
    user.local.email = email

    // Use a password hash instead of plain-text
    user.local.password = await user.generateHash(password)

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
