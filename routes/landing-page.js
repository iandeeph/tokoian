var express     = require('express');
var router      = express.Router();
// var _           = require('lodash');
// var mysql       = require('promise-mysql');
// var Promise     = require('bluebird');
// var moment      = require('moment');
// const {createCipher, createCipheriv, createDecipher, createDecipheriv, randomBytes} = require('crypto');
// const algorithm = 'aes-256-ctr';
// const key = process.env.KEY || 'b2df428b9929d3ace7c598bbf4e496b2';
// const inputEncoding = 'utf8';
// const outputEncoding = 'hex';
//
// //source : http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
// var db_config = {
//     host         : 'localhost',
//     user         : 'root',
//     password     : 'T!k3tp01nt',
//     insecureAuth : 'true',
//     database     : 'tokoian_db'
// };
//
// var tokoianConn;
//
// function handleDisconnect() {
//     tokoianConn = mysql.createPool(db_config,{
//         multipleStatements: true //for multiple update. Source : https://stackoverflow.com/questions/25552115/updating-multiple-rows-with-node-mysql-nodejs-and-q
//     }); // Recreate the connection, since
//     // the old one cannot be reused.
//
//     tokoianConn.getConnection(function(err) {              // The server is either down
//         if(err) {                                     // or restarting (takes a while sometimes).
//             console.log('error when connecting to db:', err);
//             setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
//         }                                     // to avoid a hot loop, and to allow our node script to
//     });                                     // process asynchronous requests in the meantime.
//                                             // If you're also serving http, display a 503 error.
//     tokoianConn.on('error', function(err) {
//         console.log('db error', err);
//         if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
//             handleDisconnect();                         // lost due to either server restart, or a
//         } else {                                      // connnection idle timeout (the wait_timeout
//             throw err;                                  // server variable configures this)
//         }
//     });
// }
//
// handleDisconnect();

/* GET Login page. */
router.get('/', function(req, res, next) {
        res.render('landing-page',{
            layout: 'landing'
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
