const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');
const cheerio = require('cheerio');
const ejs=require("ejs");

// const express=require('express');
const bodyParserr=require('body-parser');
// const ejs=require('ejs');
const mongoose=require('mongoose');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const { URL } = require('url');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const { log } = require('console');





app.use(express.static("public"));
app.set('view engine','ejs');




mongoose.set('strictQuery',false);
mongoose.connect('your database link',{useNewUrlParser: true});


app.use(bodyParserr.urlencoded({
  extended:true
}));

app.use(session({
  secret:"XYZ",
  resave: false,
  saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  otp:String
});



userSchema.plugin(passportLocalMongoose);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(Voter.serializeUser());
// passport.deserializeUser(Voter.deserializeUser());

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
      const user = await User.findById(id);
      done(null, user);
  } catch (err) {
      done(err, null);
  }
});




app.get("/index",function(req,res){
  if(req.isAuthenticated()){
    res.render("index");
  }else{
    res.redirect("/login");
  }
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});





app.post("/register", function(req, res) {
  const username = req.body.username;

  // Generate random OTP
  const otp = speakeasy.totp({
    secret: speakeasy.generateSecret().base32,
    digits: 6
  });
  console.log('OTP:', otp);

  // Configure nodemailer transport object
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'anujmunjal08@gmail.com',
      pass: 'Your One time Password '
    }
  });

  const mailOptions = {
    from: 'anujmunjal08@gmail.com',
    to: username,
    subject: 'OTP for Registration',
    text: `Your OTP for registration is ${otp}`
  };

  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.redirect("/register");
    } else {
      console.log('Email sent: ' + info.response);

      res.render('verify', { otp: otp, username: username });
    }
  });
});




app.post('/verify-otp', function(req, res) {
  const enteredOtp = req.body.enteredOtp;
  const storedOtp = req.body.otp;

  console.log(storedOtp);
  console.log(enteredOtp);

  if (storedOtp === enteredOtp) {
    res.render('password', {
      username: req.body.username
    });
  } else {
    // OTP verification failed
    res.render('verify-otp', {
      otp: storedOtp,
      username: req.body.username
    });
  }
});




app.post('/complete-registration', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.register(new User({ username: username }), password, function(err, user) {
    if (err) {
    console.log("hello");
      console.log(err);
      // res.send('<body style="margin: 0; padding:0;"><div style=" height: 100vh; width: 100%;background:linear-gradient(to right bottom, #fbdb89, #f48982);"><a href="/">Home</a><h1 style="padding-top: 100px;text-align: center;">You have already registered</h1></div></body>');

      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/index");
      });
    }
  });
});




app.post("/login",function(req,res){

   const user=new User({
     username:req.body.username,
     password: req.body.password
   });

   req.login(user,function(err){
     if(err){
       console.log(err);
     }else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/index");
       })
     }
   })
});











app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/",function(req,res){
   res.render("home");
})


app.get("/login",function(req,res){
  res.render("login");
});



app.get("/register",function(req,res){
  res.render("register");
});


























// Add this route to your existing server code
// Add this route to your existing server code
// Add this route to your existing server code
app.post('/search', async (req, res) => {
  const searchTerm = req.body.searchTerm;
   console.log(searchTerm);
  try {
    const amazonResults = await scrapeAmazon(searchTerm);
    const flipkartResults = await scrapeFlipkart(searchTerm);

    // Combine the results from both sources
    const combinedResults = [...amazonResults, ...flipkartResults];

    // Send the combined results as JSON
    res.render('results',{results:combinedResults});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});



// Your existing scraping functions (scrapeAmazon, scrapeFlipkart) should be present before this part



async function scrapeAmazon(searchTerm) {
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
  });

  const $ = cheerio.load(response.data);

  const amazonResults = [];

  $('.s-result-item').each((index, element) => {
    const title = $(element).find('.a-text-normal').text();
    const price = $(element).find('.a-price .a-offscreen').text();
    const image = $(element).find('.s-image').attr('src'); // Get the image URL
    const  link='https://www.amazon.com' + $(element).find('a.a-link-normal').attr('href');
    if (title && price && image) {
     amazonResults.push({ title, price, image, link }); // Include image in the result
    }
  });

  return amazonResults;
}

async function scrapeFlipkart(searchTerm) {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
  });

  const $ = cheerio.load(response.data);

  const flipkartResults = [];

  $('._1AtVbE').each((index, element) => {
    const title = $(element).find('._4rR01T').text();
    const price = $(element).find('._30jeq3').text();
     const image = $(element).find('._396cs4').attr('src');
       const link= 'https://www.flipkart.com' + $(element).find('a._1fQZEK').attr('href')

    if (title && price && image) {
       flipkartResults.push({ title, price, image, link });// Include image in the result
    }
  });

  return flipkartResults;
}