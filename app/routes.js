let isLoggedIn = require('./middlewares/isLoggedIn')
let posts = require('../data/posts')
let Twitter = require('twitter')
let then = require('express-then')
let FB = require('fb')
let Promise = require('promise')

let networks = {
  twitter:{
      icon: 'twitter',
      name: 'Twitter',
      class: 'btn-info'
  }
}

module.exports = (app) => {
  let passport = app.passport
  let twitterConfig = app.config.auth.twitter
  let facebookConfig = app.config.auth.facebook

  FB.options({
    appId:          facebookConfig.consumerKey,
    appSecret:      facebookConfig.consumerSecret,
    redirectUri:    facebookConfig.callbackUrl
  });

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


  app.post('/login', passport.authenticate('local-login', {
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
    console.log("req.user.twitter.token :: "+req.user.twitter.token)
    console.log("req.user.twitter.secret :: "+req.user.twitter.secret)
    console.log("twitterConfig.consumerKey :: "+twitterConfig.consumerKey)
    console.log("twitterConfig.consumerSecret :: "+twitterConfig.consumerSecret)
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })


      FB.setAccessToken(req.user.facebook.token);

      let socialApiCallsPromises = [];
      socialApiCallsPromises.push(twitterClient.promise.get('statuses/home_timeline'))
      socialApiCallsPromises.push(new Promise((resolve, reject) => FB.api('me',{access_token: req.user.facebook.token,  fields: ['id', 'name']} ,resolve)))


      let [[tweets],fbPosts] = await Promise.all(socialApiCallsPromises)

      let formattedTweets = tweets.map(tweet => {

        return {
          id: tweet.id_str,
          image: tweet.user.profile_image_url,
          text: tweet.text,
          name: tweet.user.name,
          username: '@'+tweet.user.screen_name,
          liked: tweet.favorited,
          network: networks.twitter
        }


      })
      console.log("Retrieved Fromatted Posts from Facebook :: "+JSON.stringify(fbPosts))

      //let fbPosts = await


      res.render('timeline.ejs',{
        posts: formattedTweets
      })
    } catch (e){
      console.log(" err in catch get TimeLine "+JSON.stringify(e))
      res.render('timeline.ejs',{
        posts: posts
      })
    }

  }))

  app.get('/share/:postId',isLoggedIn, then(async(req,res)=>{
    let postId = req.params.postId
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })

      let [tweet] = await twitterClient.promise.get('/statuses/show/' + postId)

      tweet = {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: "@" + tweet.user.screen_name,
        liked: tweet.favorited,
        network: networks.twitter
      }

      res.render('share.ejs', {
        post: tweet
      })

    }catch (e){
      console.log("Error While Sharing Tweet "+e)
    }


  }))

  app.post('/share/:postId',isLoggedIn, then(async(req,res)=>{

    let postId = req.params.postId
    try{
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })
      let text = req.body.share;
      if(text.length > 140){
        return req.flash('error','Share message greater than 140 chars')
      }
      if(!text){
        return req.flash('error','Share message cannot be empty')
      }
      console.log("Retweet Message "+text)
      await twitterClient.promise.post('/statuses/retweet/'+postId,{text})



    }catch (e){
      console.log("Error While Sharing Tweet "+JSON
      .stringify(e))
    }
    res.redirect('/timeline')

  }))

  app.post('/reply/:id',isLoggedIn, then(async(req,res) => {
    try{
      let id = req.params.id
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })
      let reply = req.body.reply
      let tweetSourceUserName = req.body.tweetSourceUserName
      if(!reply) {
        return req.flash('error', 'Status cannot be empty')
      }

      if(reply.length > 140) {
        return req.flash('error', 'Status is over 140 characters')
      }
      let replyTweetResponse = await twitterClient.promise.post('statuses/update', {
        status: tweetSourceUserName +"  "+ reply,
        in_reply_to_status_id: id
      })
      console.log("Replied to tweet ssss"+JSON.stringify(replyTweetResponse) +" for tweet id "+id)
    }
    catch(e){
        console.log("Error During Reply posting for Tweet" +e + JSON.stringify(e))
    }
    res.redirect('/timeline')
  }))

  app.get('/reply/:id', isLoggedIn, then(async(req,res) => {
    try{
      let postId = req.params.id
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret

      })

      let [tweet] = await twitterClient.promise.get('/statuses/show/' + postId)

      tweet = {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: "@" + tweet.user.screen_name,
        liked: tweet.favorited,
        network: networks.twitter
      }

      res.render('reply.ejs', {
        post: tweet
      })
    }
    catch(e){

    }
  }))

  app.get('/auth/twitter', passport.authenticate('twitter', {scope}))
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))
  // Authorization route & Callback URL
  app.get('/connect/twitter', passport.authorize('twitter', {scope}))
  app.get('/connect/twitter/callback', passport.authorize('twitter', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))
  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {scope}))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))
}