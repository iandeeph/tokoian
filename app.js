var express         = require('express');
var exphbs          = require('express-handlebars');
var path            = require('path');
var favicon         = require('serve-favicon');
var logger          = require('morgan');
var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var bodyParser      = require('body-parser');

var index = require('./routes/index');
var login = require('./routes/login');

var app = express();

function checkAuth (req, res, next) {
    // you should add to this list, for each and every secure url
    // console.log(req.url);
    //   req.session.tempUrl = "/";
    if (!req.session || !req.session.login) {
        // console.log("URL before login", req.url);
        if (req.url.substring(0, 11) === '/login-auth') {
        }else{
            // console.log('checkAuth ' + req.url);

            req.session.tempUrl = req.url;
            res.redirect('/login-auth');
            return;
        }
    }else if(req.session || req.session.login){
        // console.log("URL after login", req.url);
        if (req.url.substring(0, 11) === '/login-auth'){
            res.redirect('/');
            return;
        }else {
            if (req.session.priv == 1){
                if(req.url === '/' || req.url.substring(0, 10) === '/code-list' || req.url.substring(0, 12) === '/status-code') {
                    // console.log("Aman");
                }else{
                    res.redirect('/');
                    return;
                }
            }else if (req.session.priv == 2){
                if(req.url === '/' || req.url.substring(0, 10) === '/code-list' || req.url.substring(0, 12) === '/status-code') {
                }else{
                    res.redirect('/');
                    return;
                }
            }
        }
    }

    next();
}

process.on('uncaughtExeption', (e) => {
    console.error("error", e);
});

process.on('unhandledRejection', (e) => {
    console.error("error", e);
});

// view engine setup
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: require("./public/javascripts/helpers.js")
}));
app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: '08567235800',
    resave: false,
    saveUninitialized: true
}));

app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

app.use(checkAuth);

app.use('/', index);
app.use('/login-auth', login);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
