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
var landing_page = require('./routes/landing-page');

var app = express();

function checkAuth (req, res, next) {
    // you should add to this list, for each and every secure url
    // console.log(req.url);
    //   req.session.tempUrl = "/";
    if (req.url === '/landing-page') {
        // on landing page
    }else{
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
                if (req.session.priv === "1"){
                        if(req.url === '/' || req.url.substring(0, 12) === '/item-detail' || req.url.substring(0, 12) === '/user-status' || req.url.substring(0, 10) === '/priv-user' || req.url.substring(0, 12) === '/status-user' || req.url.substring(0, 13) === '/user-manager' || req.url.substring(0, 17) === '/pl-customer-list' || req.url.substring(0, 14) === '/recap-expense' || req.url.substring(0, 12) === '/add-expense' || req.url.substring(0, 9) === '/print-so' || req.url.substring(0, 9) === '/print-do' || req.url.substring(0, 7) === '/logout' || req.url.substring(0, 14) === '/get-top-chart' || req.url.substring(0, 4) === '/log' || req.url.substring(0, 14) === '/income-report' || req.url.substring(0, 18) === '/recap-sales-order' || req.url.substring(0, 13) === '/get-customer' || req.url.substring(0, 16) === '/add-sales-order' || req.url.substring(0, 17) === '/cust-status-code' || req.url.substring(0, 14) === '/customer-list' || req.url.substring(0, 17) === '/so-customer-list'  || req.url.substring(0, 10) === '/code-list' || req.url.substring(0, 14) === '/trxout-report' || req.url.substring(0, 13) === '/trxin-report' || req.url.substring(0, 12) === '/status-code' || req.url.substring(0, 9) === '/order-in' || req.url.substring(0, 9) === '/get-item' || req.url.substring(0, 12) === '/recap-stock') {
                        // console.log("Aman");
                    }else{
                        res.redirect('/');
                        return;
                    }
                }else if (req.session.priv === "2"){
                        if(req.url === '/' || req.url.substring(0, 12) === '/item-detail' || req.url.substring(0, 14) === '/recap-expense' || req.url.substring(0, 12) === '/add-expense' || req.url.substring(0, 9) === '/print-so' || req.url.substring(0, 17) === '/pl-customer-list' || req.url.substring(0, 9) === '/print-do' || req.url.substring(0, 7) === '/logout' || req.url.substring(0, 14) === '/get-top-chart' || req.url.substring(0, 18) === '/recap-sales-order' || req.url.substring(0, 13) === '/get-customer' || req.url.substring(0, 16) === '/add-sales-order' || req.url.substring(0, 17) === '/cust-status-code' || req.url.substring(0, 14) === '/customer-list' || req.url.substring(0, 17) === '/so-customer-list' || req.url.substring(0, 10) === '/code-list' || req.url.substring(0, 12) === '/status-code' || req.url.substring(0, 9) === '/order-in' || req.url.substring(0, 9) === '/get-item' || req.url.substring(0, 12) === '/recap-stock') {
                    }else{
                        res.redirect('/');
                        return;
                    }
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
app.use('/landing-page', landing_page);

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
