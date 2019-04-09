var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
var randomize   = require('randomatic');
var querystring = require('querystring');
var Chart       = require('chart.js');
const {createCipher, createCipheriv, createDecipher, createDecipheriv, randomBytes} = require('crypto');

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
        //multipleStatements: true //for multiple update. Source : https://stackoverflow.com/questions/25552115/updating-multiple-rows-with-node-mysql-nodejs-and-q
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

const algorithm = 'aes-256-ctr';
const key = process.env.KEY || 'b2df428b9929d3ace7c598bbf4e496b2';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

function encrypt(value) {
    const iv = new Buffer(randomBytes(16));
    const cipher = createCipheriv(algorithm, key, iv);
    let crypted = cipher.update(value, inputEncoding, outputEncoding);
    crypted += cipher.final(outputEncoding);
    return `${iv.toString('hex')}:${crypted.toString()}`;
}

moment.updateLocale('id', {
    months : [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
        "Agustus", "September", "Oktober", "November", "Desember"
    ]
});

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

exports.codeList = (message, req, res) => {
    return tokoianConn.query("select kode.idkode idkode, kode.nama nama, kode.kode kode, kode.status status, item.jumlah jumlah from kode left join item on kode.idkode = item.idkode order by kode.kode")
        .then(function (listCode) {
            res.render('code', {
                listCode : listCode,
                priv : req.session.priv,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.orderIn = (message, req, res) => {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    let getOrderId, maxOrderId, orderid, rows;
    return tokoianConn.query("select orderid from trx where jenistrx = '1' order by tanggal desc limit 1")
        .then(function (row) {
            rows = row;
            return tokoianConn.query("select * from kode where status = '1' order by kode");
        }).then(function (kodeRow){
            getOrderId = (!_.isEmpty(rows))?rows[0].orderid : "00000";
            maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
            orderid = "#IN-" + randomize('?Aa0',3,dateNow).concat(moment(Date.now()).format("YY"),("00000" + (maxOrderId+1)).slice(-5));
            res.render('order-in', {
                orderid : orderid,
                kodeRow : kodeRow,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.addSO = (message, req, res) => {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    let getOrderId, kodeRows;
    return tokoianConn.query("select soid from salesorder order by tanggal desc limit 1")
        .then(function (row) {
            getOrderId = (!_.isEmpty(row))?row[0].soid : "00000";
            return tokoianConn.query("select * from kode order by kode");
        }).then(function (kodeRow) {
            kodeRows = kodeRow;
            return tokoianConn.query("select * from customer order by nama");
        }).then(function (custRow) {
            let maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
            var orderid = "#OUT-" + randomize('?Aa0', 3, dateNow).concat(moment(Date.now()).format("YY"), ("00000" + (maxOrderId + 1)).slice(-5));

            res.render('add-so', {
                orderid : orderid,
                kodeRow : kodeRows,
                custRow : custRow,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.recapSO = (message, req, res) =>{
    return tokoianConn.query("select *, " +
        "so.soid soid, " +
        "so.hargajual hargajual, " +
        "so.jumlah jumlah, " +
        "(so.jumlah*so.hargajual) total, " +
        "so.status status, " +
        "customer.nama customer, " +
        "customer.pic pic, " +
        "customer.telp telp, " +
        "customer.alamat alamat, " +
        "kode.kode kode, " +
        "kode.nama namaitem " +
        "from " +
        "salesorder so " +
        "left join " +
        "customer " +
        "on " +
        "so.idcustomer = customer.idcustomer " +
        "left join " +
        "kode " +
        "on " +
        "so.idkode = kode.idkode " +
        "order by so.status desc, so.tanggal desc")
        .then(function (row) {
            var groupBySoid = _.groupBy(row, 'soid');
            var grandTotal =
                _(row)
                    .groupBy('soid')
                    .map((objs, key) => (
                        groupBySoid[key].push({
                            grandTotal : _.sumBy(objs, 'total')
                        })))
                    .value();
            // console.log(groupBySoid);
            res.render('recap-sales-order', {
                rows: groupBySoid,
                priv: req.session.priv,
                message: message,
                grandTotal: grandTotal
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.soCust = (message, req, res) =>{
    var idcustomer = req.query.so || {};
    let customer = {"nama": "", "alamat": "", "id": ""};
    if(!_.isEmpty(idcustomer)){
        return tokoianConn.query("select *, " +
            "so.soid soid, " +
            "so.hargajual hargajual, " +
            "so.jumlah jumlah, " +
            "(so.jumlah*so.hargajual) total, " +
            "so.status status, " +
            "customer.idcustomer idcustomer, " +
            "customer.nama customer, " +
            "customer.pic pic, " +
            "customer.telp telp, " +
            "customer.alamat alamat, " +
            "kode.kode kode, " +
            "kode.nama namaitem " +
            "from " +
            "salesorder so " +
            "left join " +
            "customer " +
            "on " +
            "so.idcustomer = customer.idcustomer " +
            "left join " +
            "kode " +
            "on " +
            "so.idkode = kode.idkode " +
            "where customer.idcustomer = '"+ decrypt(idcustomer) +"' " +
            "order by so.status desc, so.tanggal desc")
            .then(function (row) {
                console.log(row);
                if (!_.isEmpty(row)){
                    customer = {"nama": row[0].customer, "alamat": row[0].alamat, "id": row[0].idcustomer} ;
                    var groupBySoid = _.groupBy(row, 'soid');
                    var grandTotal =
                        _(row)
                            .groupBy('soid')
                            .map((objs, key) => (
                                groupBySoid[key].push({
                                    grandTotal : _.sumBy(objs, 'total')
                                })))
                            .value();
                    // console.log(groupBySoid);
                    res.render('so-customer', {
                        rows: groupBySoid,
                        priv: req.session.priv,
                        grandTotal: grandTotal,
                        customer: customer,
                        message: message

                    });
                } else {
                    res.redirect('/customer-list');
                }
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else{
        res.redirect('/customer-list');
    }
};

exports.expense = (message, req, res) => {
    var passedVariable = req.query.respost || {};
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    return tokoianConn.query("select orderid from trx where jenistrx = '4' order by tanggal desc limit 1")
        .then(function (row) {
            let getOrderId = (!_.isEmpty(row))?row[0].orderid : "00000";
            let maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
            var orderid = "#EXP-" + randomize('?Aa0', 3, dateNow).concat(moment(Date.now()).format("YY"), ("00000" + (maxOrderId + 1)).slice(-5));
            res.render('add-expense', {
                orderid : orderid,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.recapExpense = (message, req, res) => {
    return tokoianConn.query("select * " +
        "from expense " +
        "order by status desc, tanggal desc")
        .then(function (row) {
            var groupByExpid = _.groupBy(row, 'orderid');
            var grandTotal =
                _(row)
                    .groupBy('orderid')
                    .map((objs, key) => (
                        groupByExpid[key].push({
                            grandTotal : _.sumBy(objs, 'nominal')
                        })))
                    .value();
            // console.log(groupByExpid);
            res.render('recap-expense', {
                rows: groupByExpid,
                priv: req.session.priv,
                grandTotal: grandTotal,
                message: message

            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};

exports.pricelist = (message, req, res) => {
    var idcustomer = req.query.so || {};
    let customer = {"nama": "", "alamat": "", "id": ""};
    var row;
    if(!_.isEmpty(idcustomer)){
        return tokoianConn.query("select " +
            "customer.idcustomer idcustomer, " +
            "customer.nama customer, " +
            "customer.alamat alamat, " +
            "kode.idkode idkode, " +
            "kode.kode kode, " +
            "kode.nama namabarang, " +
            "item.hargabeli hargabeli, " +
            "pricelist.hargajual hargajual " +
            "from " +
            "kode " +
            "left join item " +
            "on kode.idkode = item.idkode " +
            "left join " +
            "(SELECT " +
            "* " +
            "FROM " +
            "pricelist " +
            "WHERE " +
            "idcustomer = '"+ decrypt(idcustomer) +"') pricelist " +
            "on kode.idkode = pricelist.idkode " +
            "left join customer " +
            "on pricelist.idcustomer = customer.idcustomer " +
            "order by kode.kode")
            .then(function (rows) {
                row = rows;
                return tokoianConn.query("select * " +
                    "from customer " +
                    "where idcustomer = ? ", [decrypt(idcustomer)]);
            }).then(function (customers) {
                customer = {"nama": customers[0].nama, "alamat": customers[0].alamat, "id": customers[0].idcustomer};
                res.render('pl-customer', {
                    rows: row,
                    priv: req.session.priv,
                    customer: customer,
                    message: message
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else{
        res.redirect('/customer-list');
    }
};

exports.userman = (message, req, res) => {
    return tokoianConn.query("select * from user order by priv, nama")
        .then(function (listUser) {
            res.render('user', {
                listUser : listUser,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
};
