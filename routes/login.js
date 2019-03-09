var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
var crypto      = require('crypto');

//source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var db_config = {
    host         : 'localhost',
    user         : 'bengkelb_root',
    password     : 'assholefuck123A',
    insecureAuth : 'true',
    database     : 'bengkelb_bandotcom'
};

var bandotcomConn;

function handleDisconnect() {
    bandotcomConn = mysql.createPool(db_config,{
        multipleStatements: true //for multiple update. Source : https://stackoverflow.com/questions/25552115/updating-multiple-rows-with-node-mysql-nodejs-and-q
    }); // Recreate the connection, since
    // the old one cannot be reused.

    bandotcomConn.getConnection(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    bandotcomConn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

/* GET Login page. */
router.get('/', function(req, res, next) {
    res.render('login',{
        layout: 'login'
    });
});

/* POST Login page. */
router.post('/', function(req, res, next) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var postUsername = req.body.login_username;
    var postPassword = crypto.createHash('md5').update(req.body.login_password).digest('hex');
    var arrayLogQuery = [];
    //console.log(postPassword);
    bandotcomConn.query('SELECT * FROM tb_admin').then(function(users) {
        //console.log(users);
        var loginPromise = new Promise(function (resolve, reject) {
            resolve(_.find(users, {'username' : postUsername , 'password' : postPassword}));
        });

        loginPromise.then(function(loginItem) {
            if (_.isEmpty(loginItem)){
                res.render('login',{
                    layout: 'login',
                    message : 'Username atau Password Salah..!!'
                });
            }else{
                req.session.login       = 'loged';
                req.session.username    = loginItem.username;
                req.session.name        = loginItem.nama;
                req.session.priv        = loginItem.priv;
                //console.log(req.session.name );
                var logString = "Username : "+ loginItem.username +"\n" +
                    "Nama : "+loginItem.nama;
                var queryLogString = "INSERT INTO tb_log (user, aksi, detail, tanggal) VALUES " +
                    "('" + loginItem.nama + "', 'User Login','" + logString + "','" + dateNow + "')";

                var logPush = bandotcomConn.query(queryLogString);

                Promise.all([logPush])
                    .then(function () {
                        res.redirect('/');
                    });
            }
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
    }).catch(function(error){
        //logs out the error
        console.error(error);
    });
});

module.exports = router;
