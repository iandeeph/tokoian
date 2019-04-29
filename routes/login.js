var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
const {createCipher, createCipheriv, createDecipher, createDecipheriv, randomBytes} = require('crypto');
const algorithm = 'aes-256-ctr';
const key = process.env.KEY || 'b2df428b9929d3ace7c598bbf4e496b2';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

//source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var db_config = {
    host         : 'localhost',
    user         : 'root',
    password     : 'T!k3tp01nt',
    insecureAuth : 'true',
    database     : 'tokoian_db'
};

var tokoianConn;

function handleDisconnect() {
    tokoianConn = mysql.createPool(db_config,{
        multipleStatements: true //for multiple update. Source : https://stackoverflow.com/questions/25552115/updating-multiple-rows-with-node-mysql-nodejs-and-q
    }); // Recreate the connection, since
    // the old one cannot be reused.

    tokoianConn.getConnection(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    tokoianConn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

function encrypt(value) {
    const iv = new Buffer(randomBytes(16));
    const cipher = createCipheriv(algorithm, key, iv);
    let crypted = cipher.update(value, inputEncoding, outputEncoding);
    crypted += cipher.final(outputEncoding);
    return `${iv.toString('hex')}:${crypted.toString()}`;
}

function decrypt(value) {
    const textParts = value.split(':');

    //extract the IV from the first half of the value
    const IV = new Buffer(textParts.shift(), outputEncoding);

    //extract the encrypted text without the IV
    const encryptedText = new Buffer(textParts.join(':'), outputEncoding);

    //decipher the string
    const decipher = createDecipheriv(algorithm,key, IV);
    let decrypted = decipher.update(encryptedText,  outputEncoding, inputEncoding);
    decrypted += decipher.final(inputEncoding);
    return decrypted.toString();
}

/* GET Login page. */
router.get('/', function(req, res, next) {
    res.render('login',{
        layout: 'login',
        message : req.session.message
    });
});

/* POST Login page. */
router.post('/', function(req, res, next) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var postUsername = req.body.login_username;
    var postPassword = req.body.login_password;
    let logString, queryLogString;
    let logPush = {};
    // console.log(postPassword);
    tokoianConn.query('SELECT * FROM user where username = "'+ postUsername +'" and status = "1" limit 1')
        .then(function(users) {
            // console.log(decrypt(users[0].password));
            if (!_.isEmpty(users)){
                if (decrypt(users[0].password) !== postPassword){
                    logString = "Username : "+ users[0].username +"\n" +
                        "Nama : "+users[0].nama;
                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + users[0].nama + "', 'Wrong Password Login..!!','" + logString + "','" + dateNow + "')";

                    logPush = tokoianConn.query(queryLogString);

                    Promise.all([logPush])
                        .then(function () {
                            req.session.message = {"text": "Username atau Password Salah..!!", "color": "red"};
                            res.redirect("/login-auth");
                            delete req.session.message;
                        });
                }else{
                    req.session.login       = 'loged';
                    req.session.username    = users[0].username;
                    req.session.name        = users[0].nama;
                    req.session.priv        = users[0].priv;
                    //console.log(req.session.name );
                    logString = "Username : "+ users[0].username +"\n" +
                        "Nama : "+users[0].nama;
                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + users[0].nama + "', 'User Login','" + logString + "','" + dateNow + "')";

                    logPush = tokoianConn.query(queryLogString);

                    Promise.all([logPush])
                        .then(function () {
                            res.redirect(req.session.tempUrl);
                        });
                }
            } else {
                logString = "Username : "+ postUsername +"\n" +
                    "Password : "+postPassword;
                queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                    "('" + postUsername + "', 'Account tidak ada..!!','" + logString + "','" + dateNow + "')";

                logPush = tokoianConn.query(queryLogString);

                Promise.all([logPush])
                    .then(function () {
                        req.session.message = {"text": "Account tidak ada..!!", "color": "red"};
                        res.redirect("/login-auth");
                        delete req.session.message;
                    });
            }
        }).catch(function(error){
            //logs out the error
            console.error(error);
        });
});

router.use(function (err, req, res, next) {
    if (err) {
        console.log('Error', err);
    } else {
        console.log('404')
    }
});

module.exports = router;
