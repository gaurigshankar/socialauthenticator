let isLoggedIn = require('./middlewares/isLoggedIn')
let posts = require('../data/posts')
let Twitter = require('twitter')
let then = require('express-then')

let networks = {
  twitter:{
    network:{
      icon: 'facebook',
      name: 'Facebook',
      class: 'btn-primary'
    }
  }
}

module.exports = (app) => {
  let passport = app.passport
  let twitterConfig = app.config.auth.twitter

  app.get('/', (req, res) => res.render('index.ejs'))

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  })

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error') })
  })


  app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))
  app.get('/signup', (req,res) => {
    res.render('signup.ejs',{message: req.flash('error')})
  })
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))

  let scope = 'email'

// Authentication route & Callback URL
  app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

// Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {scope}))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
  }))

  app.get('/compose', isLoggedIn, (req,res) => {
    res.render('compose.ejs',{
      message: req.flash('error')
    })
  })
  app.post('/compose', isLoggedIn, then (async (req,res) => {
    try{
      let status = req.body.text
      if(status.length > 140){
        req.flash('error','Status is over 140 characterss !')
      }
      if(!status){
        req.flash('error','Status cannot be empty')
      }
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })
      await twitterClient.promise.post('statuses/update',{status})
      res.redirect('/timeline')
    }catch (e){
      console.log("Error during compose "+JSON.stringify(e))
    }


  }))

  app.post('/like/:id',isLoggedIn, then (async (req,res) => {
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })
      let id = req.params.id
      await twitterClient.promise.post('favorites/create', {id})
    } catch (e){
        console.log("Error During like a tweet "+e)
    }
    res.end()
  }))

  app.post('/unlike/:id',isLoggedIn, then (async (req,res) => {
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })
      let id = req.params.id
      await twitterClient.promise.post('favorites/destroy', {id})
    } catch (e){
      console.log("Error During unlike a tweet "+e)
    }
    res.end()
  }))
  app.get('/timeline', isLoggedIn , then( async (req,res) => {
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })

      let [tweets] = await twitterClient.promise.get('statuses/home_timeline')
      tweets = tweets.map(tweet => {
        return {
          id: tweet.id,
          image: tweet.user.profile.image_url,
          text: tweet.text,
          name: tweet.user.name,
          username: '@'+tweet.user.screen_name,
          liked: tweet.favorited,
          network: networks.twitter
        }


      })
      res.render('timeline.ejs',{
        posts: tweets
      })
    } catch (e){
      console.log(twitterConfig.consumerKey +" err in catch "+JSON.stringify(e))
      res.render('timeline.ejs',{
        posts: posts
      })
    }

  }))
}