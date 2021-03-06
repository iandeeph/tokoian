var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
var randomize   = require('randomatic');
var querystring = require('querystring');
var Chart       = require('chart.js');
const getPage    = require('../utils/getPage');
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

function printDateNow() {
    return moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
}

/* GET home page. */
router.get('/', (req, res) => {
    let groupedOrderid, bulanTahun;
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
        "where so.status = 'Open' " +
        "order by so.status desc, so.tanggal desc")
        .then((row) => {
            groupedOrderid = _.groupBy(row, 'soid');
            bulanTahun = {"bulantahun": moment(Date.now()).format("MMMM YYYY")};
        }).then(() => {
            res.render('index', {
                rows: groupedOrderid,
                bulanTahun : bulanTahun
            });
        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});

/* GET AJAX home page CHART. */
router.get('/get-top-chart', (req, res) => {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    let template = {"labels" : [], "data" : []};
    let labels = [];
    let data = [];
    var queryString = "select " +
        "trx.jumlah jumlah, " +
        "kode.kode kode, " +
        "kode.nama nama " +
        "from " +
        "(SELECT " +
        "idkode, sum(jumlah) jumlah " +
        "FROM " +
        "trx " +
        "WHERE " +
        "jenistrx = '2' AND " +
        "MONTH(tanggal) = ? " +
        "AND YEAR(tanggal) = ? " +
        "group by idkode order by jumlah desc limit 5 ) trx " +
        "left join kode on trx.idkode = kode.idkode " +
        "";
    return tokoianConn.query(queryString, [dateMonth, dateYear])
        .then((rowItem) => {
            rowItem.map(item => {
                labels.push(item.kode + " ("+ item.nama +")");
                data.push(item.jumlah);
            });
        }).then(() => {
            template = {"labels": labels, "data": data};
        }).then(() => {
            res.json(template);
        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});



/* GET code-list page. */
router.get('/code-list', (req, res) => {
    let message = {"text": "", "color": "green"};
    getPage.codeList(message, req, res);
});

/* POST add-code page. */
router.post('/code-list', (req, res) => {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    var arrayKodeQuery = [];
    var arrayItemQuery = [];
    var arrayLogQuery = [];
    var maxIdCode, logString, message;
    var num = 1;
    var lists;
    if (!_.isUndefined(req.body.addCodeSubmit)){
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                lists = Array.prototype.slice.call(req.body.listKode);

                return tokoianConn.query("select max(idkode) maxid from kode");
            }).then(function (maxId) {
                // console.log(maxId);
                return Promise.each(lists, (listStock) => {
                    maxIdCode = (parseInt(maxId[0].maxid || 0) + num);
                    // console.log(maxIdCode);
                    arrayKodeQuery.push([listStock.kode, listStock.nama]);
                    arrayItemQuery.push([maxIdCode]);

                    logString = "ID Kode : " + maxIdCode + "\n" +
                        "Kode Barang : " + listStock.kode + "\n" +
                        "Nama Barang : " + listStock.nama + "\n";

                    arrayLogQuery.push([user, "Tambah Kode Produk", logString, dateNow]);
                    num++;
                });
            }).then(() => {
                var queryKodeString = "INSERT INTO kode (kode, nama) VALUES?";
                return tokoianConn.query(queryKodeString, [arrayKodeQuery]);
            }).then(() => {
                var queryItemString = "INSERT INTO item (idkode) VALUES?";
                return tokoianConn.query(queryItemString, [arrayItemQuery]);
            }).then(() => {
                var queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";
                return tokoianConn.query(queryLogString, [arrayLogQuery])
            }).then(() => {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Tambah Kode Suskses..", "color": "green"};
                res.redirect('/code-list');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }else if (!_.isUndefined(req.body.editCodeSubmit)){
        var updateKode = "UPDATE kode SET nama = ?, kode = ? where idkode = ?";
        let updateKodeArr = [req.body.editKode.nama || "", req.body.editKode.kode || "", decrypt(req.body.editCodeSubmit)];

        logString = "Kode Barang : " + tokoianConn.escape(req.body.editKode.kodeOld) + "\n" +
            "Nama Barang : " + tokoianConn.escape(req.body.editKode.namaOld) + "\n" +
            "Updated to :\n " +
            "Kode Barang : " + tokoianConn.escape(req.body.editKode.kode) + "\n" +
            "Nama Barang : " + tokoianConn.escape(req.body.editKode.nama);
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";
        var insLogArr = [user, 'Edit Detail Kode', logString, dateNow];
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(updateKode, updateKodeArr);
            }).then(function () {
                return tokoianConn.query(insertLog, [[insLogArr]]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Edit Kode Suskses..", "color": "green"};
                res.redirect('/code-list');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }
});

/* GET AJAX code-list page. */
router.get('/status-code', (req, res) => {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var idkode = decrypt(req.query.kode) || {};
    var updateStatus = "UPDATE kode SET status = ? where idkode = ?";
    let listCode;
    // console.log(updateStatus);
    return tokoianConn.query("START TRANSACTION;")
        .then(() => {
            return tokoianConn.query("select " +
                "kode.idkode idkode, " +
                "kode.nama nama, " +
                "kode.kode kode, " +
                "kode.status status, " +
                "item.jumlah jumlah " +
                "from " +
                "kode " +
                "left join " +
                "item " +
                "on " +
                "kode.idkode = item.idkode " +
                "where kode.idkode = ?", [idkode]);
        }).then((listKode) => {
            listCode = listKode;
            if (listCode[0].jumlah > 0 ) {
                res.send("Not Empty");
                return Promise.reject((error) =>{
                    return tokoianConn.query("ROLLBACK;");
                });
            }
        }).then(() => {
            return tokoianConn.query(updateStatus, [passedVariable, idkode]);
        }).then((a) => {
            var logString = "Kode Barang : " + tokoianConn.escape(listCode[0].kode) + "\n" +
                "Nama Barang : " + tokoianConn.escape(listCode[0].nama) + "\n" +
                "Status to : " + tokoianConn.escape(passedVariable) + "\n";
            var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ?";
            return tokoianConn.query(insertLog, [[[user, 'Edit Status', logString, dateNow]]]);
        }).then(() => {
            return tokoianConn.query("COMMIT;");
        }).then(() => {
            return res.send("ok");
        }).catch(function (error) {
            return tokoianConn.query("ROLLBACK;").then(() => {
                console.error(printDateNow() + error);
            });
            //logs out the error
        });
});

/* GET order-in page. */
router.get('/order-in', function(req, res) {
    let message = {"text": "", "color": ""};
    getPage.orderIn(message, req, res);
});

/* POST order-in page. */
router.post('/order-in', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postOrder = req.body.inOrder || {};
    let queryItemString = "";
    let queryTrxString = "";
    let queryLogString = "";
    var itemPush = [];
    var trxPush = [];
    var logPush = [];
    if (!_.isUndefined(req.body.ordeInSubmit)){
        // console.log(req.body);
        let queryStr = "select " +
            "kode.idkode idkode, " +
            "kode.nama nama, " +
            "kode.kode kode, " +
            "item.hargabeli hargabeli, " +
            "item.jumlah jumlah " +
            "from " +
            "kode " +
            "left join " +
            "item " +
            "on " +
            "kode.idkode = item.idkode";
        queryTrxString = "INSERT INTO trx (idkode, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES ?";
        queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ?";
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(queryStr);
            }).then(function (rows) {
                // console.log(queryStr);
                var lists = Array.prototype.slice.call(postOrder);
                Promise.each(lists, function (listStock) {
                    console.log(listStock);
                    var hargaBeli = parseInt(listStock.hargabeli.replace(/[^0-9]/gi, ''));
                    var jumlah = parseInt(listStock.jumlah.replace(/[^0-9]/gi, ''));
                    var total;

                    var cekNamakodePromise = new Promise(function (resolve, reject) {
                        resolve(_.find(rows, {'kode': decodeURI(listStock.kode)}));
                    });

                    cekNamakodePromise.then(function (resRows) {
                        console.log(resRows);
                        if (!_.isEmpty(resRows) || !_.isUndefined(resRows)) {
                            total = (parseInt(listStock.jumlah.replace(/[^0-9]/gi, '')) + resRows.jumlah);

                            queryItemString = "UPDATE item SET " +
                                "hargabeli = ? , " +
                                "jumlah = ? " +
                                "where idkode = ? ";

                            tokoianConn.query(queryItemString, [hargaBeli, total, resRows.idkode])
                                .catch(function (error) {
                                    req.session.message = {"text": "Order baru gagal diproses.! Error : "+ error, "color": "red"};
                                    tokoianConn.query("ROLLBACK;");
                                    res.redirect('/order-in');
                                    return Promise.reject(dateNow + " - Order baru gagal diproses.! Error : "+ error);
                                    //logs out the error
                                });

                            trxPush.push([resRows.idkode, listStock.orderid, hargaBeli, dateNow, '1', jumlah]);

                            let logString = "Order ID : " + tokoianConn.escape(listStock.orderid) + "\n" +
                                "Kode Barang : " + tokoianConn.escape(listStock.kode) + "\n" +
                                "Nama Barang : " + tokoianConn.escape(resRows.nama) + "\n" +
                                "Harga Beli : " + tokoianConn.escape(Intl.NumberFormat('en-IND').format(hargaBeli)) + "\n" +
                                "Jumlah : " + tokoianConn.escape(jumlah);

                            logPush.push([user, 'Barang Masuk', logString, dateNow]);
                // console.log(trxPush);
                        }
                    }).catch(function (error) {
                        return tokoianConn.query("ROLLBACK;").then(() => {
                            console.error(printDateNow() + error);
                        });
                        //logs out the error
                    });
                });
                return Promise.all([trxPush, logPush]);
            }).then(function (a) {
                console.log(a);
                return tokoianConn.query(queryTrxString, [trxPush]);
            }).then(function () {
                return tokoianConn.query(queryLogString, [logPush]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Barang masuk berhasil.", "color": "green"};
                res.redirect('/order-in');
            }).catch(function (error) {
                req.session.message = {"text": "Order baru gagal diproses.! Error : "+ error, "color": "red"};
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }
});

/* GET AJAX get item page. */
router.get('/get-item', function(req, res) {
    // console.log(req.query.id);
    if (!_.isUndefined(req.query.id) && !_.isUndefined(req.query.cust)){
        let qryString = "select " +
            "kode.idkode idkode, " +
            "kode.nama nama, " +
            "kode.kode kode, " +
            "pricelist.hargajual hargajual, " +
            "item.hargabeli hargabeli, " +
            "item.jumlah jumlah " +
            "from " +
            "kode " +
            "left join " +
            "item " +
            "on " +
            "kode.idkode = item.idkode " +
            "left join " +
            "(SELECT " +
            "* " +
            "FROM " +
            "pricelist " +
            "WHERE " +
            "idcustomer = ?) pricelist " +
            "on " +
            "kode.idkode = pricelist.idkode " +
            "where kode.status = '1' AND kode.kode = ? " +
            "order by kode.nama";
        return tokoianConn.query(qryString, [req.query.cust, req.query.id])
            .then(function (listKode) {
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    } else if (!_.isUndefined(req.query.id) && _.isUndefined(req.query.cust)){
        let qryString ="select " +
        "kode.idkode idkode, " +
        "kode.nama nama, " +
        "kode.kode kode, " +
        "item.hargabeli hargabeli, " +
        "item.jumlah jumlah " +
        "from " +
        "kode " +
        "left join " +
        "item " +
        "on " +
        "kode.idkode = item.idkode " +
        "where kode.status = '1'  AND kode.kode = ? " +
        "order by kode.nama";
        // console.log(qryString);
        return tokoianConn.query(qryString, [[req.query.id]])
            .then(function (listKode) {
                // console.log(listKode);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    } else if (_.isUndefined(req.query.id) && _.isUndefined(req.query.cust)){
        return tokoianConn.query("select " +
            "kode.idkode idkode, " +
            "kode.nama nama, " +
            "kode.kode kode, " +
            "item.hargabeli hargabeli, " +
            "item.jumlah jumlah " +
            "from " +
            "kode " +
            "left join " +
            "item " +
            "on " +
            "kode.idkode = item.idkode " +
            "where kode.status = '1' " +
            "order by kode.nama")
            .then(function (listKode) {
                // console.log(listKode);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    } else if (_.isUndefined(req.query.id) && !_.isUndefined(req.query.cust)){
        return tokoianConn.query("select * " +
            "from " +
            "pricelist  " +
            "left join " +
            "kode " +
            "on " +
            "pricelist.idkode = kode.idkode " +
            "where kode.status = '1' AND pricelist.idcustomer = ? " +
            "order by kode.nama", [req.query.cust])
            .then(function (listKode) {
                // console.log(listKode);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    }
});

/* GET recap page. */
router.get('/recap-stock', function(req, res) {
    tokoianConn.query("SELECT  " +
        "t1.idkode idkode, " +
        "t1.kode kode, " +
        "t1.jumlah stock, " +
        "t1.nama nama, " +
        "t1.hargabeli hargabeli, " +
        "so.kebutuhan totalso, " +
        "(t1.jumlah-so.kebutuhan) resstock " +
        "FROM " +
        "(SELECT  " +
        "kode.idkode idkode, " +
        "kode.kode kode, " +
        "item.jumlah jumlah, " +
        "kode.nama nama, " +
        "item.hargabeli hargabeli " +
        "FROM " +
        "kode " +
        "LEFT JOIN item ON kode.idkode = item.idkode " +
        "WHERE " +
        "kode.status = '1') t1 " +
        "LEFT JOIN " +
        "(SELECT  " +
        "idkode, SUM(jumlah) kebutuhan " +
        "FROM " +
        "salesorder " +
        "WHERE " +
        "status = 'Open' " +
        "GROUP BY idkode) so ON t1.idkode = so.idkode")
            .then(function (rowItem) {
                res.render('recap-stock', {
                    rows: rowItem,
                    priv: req.session.priv
                });
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
});

/* GET recap page. */
router.get('/item-detail', function(req, res) {
    let idkode = decrypt(req.query.item);
    tokoianConn.query("SELECT *, " +
        "kode.nama namaitem, " +
        "kode.kode kode " +
        "FROM " +
        "(SELECT " +
        "t.idtrx idtrx, " +
        "t.jenistrx jenistrx, " +
        "t.trxidkode trxidkode, " +
        "t.trxtanggal trxtanggal, " +
        "t.orderid orderid, " +
        "t.itemMasuk masuk, " +
        "t.itemKeluar keluar, " +
        "@currStock:=@currStock + (t.itemMasuk - t.itemKeluar) stock " +
        "FROM " +
        "(SELECT " +
            "idtrx, " +
            "jenistrx, " +
            "idkode trxidkode, " +
            "orderid, " +
            "tanggal trxtanggal, " +
            "SUM(CASE " +
                "WHEN " +
                "jenistrx = '1' OR jenistrx = '3' OR jenistrx = '4' " +
                "THEN " +
                "jumlah " +
                "ELSE 0 " +
                "END) AS itemMasuk, " +
            "SUM(CASE " +
                "WHEN jenistrx = '2' OR jenistrx = '5' " +
                "THEN jumlah " +
                "ELSE 0 " +
                "END) AS itemKeluar " +
        "FROM " +
        "trx, (SELECT @currStock:=0) AS currsStock " +
        "WHERE " +
        "idkode = ? " +
        "GROUP BY idtrx) AS t) AS t1 " +
        "LEFT JOIN " +
        "kode ON t1.trxidkode = kode.idkode " +
        "LEFT JOIN " +
        "salesorder ON t1.orderid = salesorder.soid " +
        "LEFT JOIN " +
        "customer ON salesorder.idcustomer = customer.idcustomer " +
        "where salesorder.idkode = ? or salesorder.idkode is null " +
        "ORDER BY t1.trxtanggal DESC", [idkode, idkode])
            .then(function (rowItem) {
                let text = "SELECT *, " +
                    "customer.nama namacustomer " +
                    "FROM " +
                    "(SELECT " +
                    "t.idtrx idtrx, " +
                    "t.jenistrx jenistrx, " +
                    "t.trxidkode trxidkode, " +
                    "t.trxtanggal trxtanggal, " +
                    "t.orderid orderid, " +
                    "t.itemMasuk masuk, " +
                    "t.itemKeluar keluar, " +
                    "@currStock:=@currStock + (t.itemMasuk - t.itemKeluar) stock " +
                    "FROM " +
                    "(SELECT " +
                    "idtrx, " +
                    "jenistrx, " +
                    "idkode trxidkode, " +
                    "orderid, " +
                    "tanggal trxtanggal, " +
                    "SUM(CASE " +
                    "WHEN " +
                    "jenistrx = '1' OR jenistrx = '3' OR jenistrx = '4' " +
                    "THEN " +
                    "jumlah " +
                    "ELSE 0 " +
                    "END) AS itemMasuk, " +
                    "SUM(CASE " +
                    "WHEN jenistrx = '2' OR jenistrx = '5' " +
                    "THEN jumlah " +
                    "ELSE 0 " +
                    "END) AS itemKeluar " +
                    "FROM " +
                    "trx, (SELECT @currStock:=0) AS currsStock " +
                    "WHERE " +
                    "idkode = '"+ idkode +"' " +
                    "GROUP BY idtrx) AS t) AS t1 " +
                    "LEFT JOIN " +
                    "kode ON t1.trxidkode = kode.idkode " +
                    "LEFT JOIN " +
                    "salesorder ON t1.orderid = salesorder.soid " +
                    "LEFT JOIN " +
                    "customer ON salesorder.idcustomer = customer.idcustomer " +
                    "where salesorder.idkode = ? or salesorder.idkode is null " +
                    "ORDER BY t1.trxtanggal DESC";
                console.log(text);
                res.render('item-detail', {
                    rows: rowItem,
                    priv: req.session.priv
                });
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
});

/* GET trx-in page. */
router.get('/trxin-report', function(req, res) {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    var queryString = "select *, (hargabeli*jumlah) total from trx " +
        "LEFT JOIN kode ON trx.idkode = kode.idkode " +
        "where (jenistrx = '1' OR jenistrx = '3' OR jenistrx = '4') AND " +
        "MONTH(trx.tanggal) = '" + dateMonth + "' " +
        "AND YEAR(trx.tanggal) = '" + dateYear + "' " +
        "order by trx.tanggal";
    tokoianConn.query(queryString)
        .then(function (rowItem) {
            var groupedOrderid = _.groupBy(rowItem, 'orderid');

            res.render('trxin-report', {
                template: groupedOrderid,
                rows: rowItem,
                grandTotal: _.sumBy(rowItem, 'total')
            });
        }).catch(function (error) {
        //logs out the error
        console.error(printDateNow() + error);
    });
});

/* POST trx-in page. */
router.post('/trxin-report', function(req, res) {
    var postDate = req.body.periode;

    if (_.isEmpty(postDate.start)) {
        res.redirect('/trxin-report');
    } else {
        var startDate = moment(new Date(postDate.start)).format("YYYY-MM-DD 00:00:00");
        var endDate = moment(new Date(postDate.end)).format("YYYY-MM-DD 23:59:59");
        var message = {'text': "", 'color': ""};
        var filterDate = {
            'start': moment(new Date(postDate.start)).format("DD MMMM, YYYY"),
            'end': moment(new Date(postDate.end)).format("DD MMMM, YYYY")
        };
        var queryString = "select *, (hargabeli*jumlah) total from trx " +
            "LEFT JOIN kode ON trx.idkode = kode.idkode " +
            "where (jenistrx = '1' OR jenistrx = '3' OR jenistrx = '4') AND " +
            "trx.tanggal between '" + startDate + "' " +
            "AND '" + endDate + "' " +
            "order by trx.tanggal";
        tokoianConn.query(queryString)
            .then(function (rowItem) {
                if (!_.isEmpty(rowItem)) {
                    var groupedOrderid = _.groupBy(rowItem, 'orderid');
                    res.render('trxin-report', {
                        template: groupedOrderid,
                        rows: rowItem,
                        grandTotal: _.sumBy(rowItem, 'total'),
                        filterDate: filterDate
                    });
                } else {
                    message = {'text': "Tidak ada laporan di tanggal yang dipilih..", 'color': "red"};
                    res.render('trxin-report', {
                        message: message,
                        grandTotal: 0,
                        filterDate: filterDate
                    });
                }
            }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
    }
});

/* GET list customer page. */
router.get('/customer-list', function(req, res) {
    // var message = {"text": "", "color": ""};
    return tokoianConn.query("select *, " +
        "customer.idcustomer idcustomer, " +
        "salesorder.idcustomer idcustsales, " +
        "customer.status status " +
        "from customer " +
        "left join " +
        "(select idcustomer " +
        "from salesorder " +
        "where idsalesorder " +
        "in " +
        "(select MAX(idsalesorder) " +
        "from salesorder group by idcustomer)) salesorder " +
        "on customer.idcustomer = salesorder.idcustomer " +
        "group by customer.nama")
        .then(function (listCust) {
            res.render('recap-customer', {
                listCode : listCust,
                priv : req.session.priv,
                message: req.session.message
            });
            delete req.session.message;
        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});

/* POST list customer page. */
router.post('/customer-list', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    var arrayCustomerQuery = [];
    var arrayLogQuery = [];
    var logString = "";
    let pushCust = "";
    let pushLog = "";
    if (!_.isUndefined(req.body.addTokoSubmit)){
        var postCust = req.body.addToko;
        let nama = postCust.nama || "-";
        let pic = postCust.pic || "-";
        let telp = postCust.telp || "-";
        let alamat = postCust.almaat || "-";
        // console.log(req.body);
        arrayCustomerQuery.push([nama, pic, telp, alamat]);

        logString = "Nama Toko : " + nama + "\n" +
            "PIC : " + pic + "\n" +
            "No Telp : " + telp + "\n" +
            "Alamat : " + alamat + "\n";

        arrayLogQuery.push([user, "Tambah Customer Baru", logString, dateNow]);
        // console.log(arrayCustomerQuery);
        var queryCustomerString = "INSERT INTO customer (nama, pic, telp, alamat) VALUES?";


        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(queryCustomerString, [arrayCustomerQuery]);
            }).then(function (results) {
                var queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";
                return tokoianConn.query(queryLogString, [arrayLogQuery]);
            }).then(function (results) {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Toko baru berhasil ditambah.", "color": "green"};
                res.redirect('/customer-list');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }else if (!_.isUndefined(req.body.editTokoSubmit)){
        var updateCust = "UPDATE customer SET " +
            "nama =  ?, " +
            "pic =  ?, " +
            "telp =  ?, " +
            "alamat =  ? " +
            "where idcustomer = ?";

        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(updateCust, [[req.body.editToko.nama, req.body.editToko.pic, req.body.editToko.telp, req.body.editToko.alamat, decrypt(req.body.editTokoSubmit)]]);
            }).then(function () {
                logString = "Nama Toko : " + tokoianConn.escape(req.body.editToko.namaOld) + "\n" +
                    "PIC : " + tokoianConn.escape(req.body.editToko.picOld) + "\n" +
                    "No Telp : " + tokoianConn.escape(req.body.editToko.telpOld) + "\n" +
                    "Alamat : " + tokoianConn.escape(req.body.editToko.alamatOld) + "\n" +
                    "Updated to :\n " +
                    "Nama Toko : " + tokoianConn.escape(req.body.editToko.nama) + "\n" +
                    "PIC : " + tokoianConn.escape(req.body.editToko.pic) + "\n" +
                    "No Telp : " + tokoianConn.escape(req.body.editToko.telp) + "\n" +
                    "Alamat : " + tokoianConn.escape(req.body.editToko.alamat);
                var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ? ";
                return tokoianConn.query(insertLog, [[[user, 'Edit Detail Customer', logString, dateNow]]]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Edit toko berhasil.", "color": "green"};
                res.redirect('/customer-list');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }
});

/* GET AJAX code-list page. */
router.get('/cust-status-code', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var id = decrypt(req.query.kode) || {};
    let namaCust = "";
    // console.log(updateStatus);
    return tokoianConn.query("START TRANSACTION;")
        .then(() => {
            return tokoianConn.query("select * " +
                "from " +
                "customer " +
                "where idcustomer = ?", [[id]]);
        }).then(function (list) {
            namaCust = list[0].nama;
            var updateStatus = "UPDATE customer SET status =  ? where idcustomer = ?";
            return tokoianConn.query(updateStatus, [passedVariable, id]);
        }).then(function () {
            // console.log(list[0].nama);
            var logString = "Nama Customer : " + tokoianConn.escape(namaCust) + "\n" +
                "Status to : " + tokoianConn.escape(passedVariable);
            var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ? ";
            return tokoianConn.query(insertLog, [[[user, 'Edit Status Customer', logString, dateNow]]]);
        }).then(function () {
            return tokoianConn.query("COMMIT;");
        }).then(() => {
                res.send("ok");
        }).catch(function (error) {
            return tokoianConn.query("ROLLBACK;").then(() => {
                console.error(printDateNow() + error);
            });
            //logs out the error
        });
});

/* GET add sales order page. */
router.get('/add-sales-order', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.addSO(message, req, res);
});

/* POST add sales order page. */
router.post('/add-sales-order', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postOrder = req.body.addSo || {};
    let orderid = req.body.orderid || {};
    let customer = req.body.customer || {};
    let querySoArray = [];
    let querylogArray = [];
    let querySoString = "";
    let queryLogString = "";
    if (!_.isUndefined(req.body.addSoSubmit)){
        return Promise.each(postOrder, function (listSo) {
            // console.log(listSo);
            let postHargaJual = listSo.hargajual || "0";
            let postJumlah = listSo.jumlah || "0";
            var hargaJual = parseInt(postHargaJual.replace(/[^0-9]/gi, ''));
            var jumlah = parseInt(postJumlah.replace(/[^0-9]/gi, ''));

            let logString = "Sales Order ID : " + orderid + "\n" +
                "Nama Customer : " + customer.nama + "\n" +
                "Kode Barang : " + decodeURI(listSo.kode) + "\n" +
                "Nama Barang : " + listSo.nama + "\n" +
                "Harga Jual : " + Intl.NumberFormat('en-IND').format(hargaJual) + "\n" +
                "Jumlah : " + jumlah;

            querySoArray.push([orderid, customer.idcustomer, listSo.idkode, hargaJual, dateNow, jumlah]);
            querylogArray.push([user, 'Input Sales Order', logString, dateNow]);
        }).then(function () {
            return tokoianConn.query("START TRANSACTION;");
        }).then(() => {
            querySoString = "INSERT INTO salesorder (soid, idcustomer, idkode, hargajual, tanggal, jumlah) VALUES?";
            return tokoianConn.query(querySoString, [querySoArray]);
        }).then(function () {
            queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";
            return tokoianConn.query(queryLogString, [querylogArray]);
        }).then(function () {
            return tokoianConn.query("COMMIT;");
        }).then(() => {
            req.session.message = {"text": "Sales order berhasil ditambah.", "color": "green"};
            res.redirect('/add-sales-order');
        }).catch(function (error) {
            return tokoianConn.query("ROLLBACK;").then(() => {
                console.error(printDateNow() + error);
            });
            //logs out the error
        });
    }
});

/* GET ajax get cust detail. */
router.get('/get-customer', function(req, res) {
    // console.log(req.query.id);
    if (!_.isUndefined(req.query.id)){
        let qryString = "select * " +
            "from " +
            "customer " +
            "where nama = ? and status = '1'" +
            "order by nama";
        return tokoianConn.query(qryString, [[req.query.id]])
            .then(function (listKode) {
                // console.log(qryString);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    }else{
        let qryString = "select * " +
            "from " +
            "customer " +
            "where status = '1'" +
            "order by nama";
        return tokoianConn.query(qryString)
            .then(function (listKode) {
                // console.log(qryString);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    }
});

/* GET recap sales order page. */
router.get('/recap-sales-order', function(req, res) {
    // console.log(req.url);
    let message = {"text": "", "color": ""};
    getPage.recapSO(message, req, res);
});

/* POST recap sales order. */
router.post(['/recap-sales-order', '/so-customer-list'], function(req, res) {
    // console.log(req.url);
    let curUrl = req.url;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let querySoString = "";
    let queryLogString = "";
    let queryItemString = "";
    let queryTrxString = "";
    let arrItemQry = [];
    let arrLogQry = [];
    var rows = "";
    var logPush = "";
    let recapSoMainQry = "select *, " +
        "so.soid soid, " +
        "so.hargajual hargajual, " +
        "so.jumlah jumlah, " +
        "(so.jumlah*so.hargajual) total, " +
        "so.status status, " +
        "customer.nama customer, " +
        "customer.pic pic, " +
        "customer.telp telp, " +
        "customer.alamat alamat, " +
        "item.jumlah stock, " +
        "item.hargabeli hargabeli, " +
        "(item.jumlah-so.jumlah) sisastock, " +
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
        "left join " +
        "item " +
        "on " +
        "so.idkode = item.idkode " +
        "where so.soid = ?";
    console.log(recapSoMainQry);
    if (!_.isUndefined(req.body.hapusSoBtn)) { //DELETE SO
        querySoString = "UPDATE salesorder SET status='Dihapus' WHERE soid = ?";
        let logString = "Sales Order ID : " + req.body.deletedSoid;

        queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ?";

        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(querySoString, [req.body.deletedSoid]);
            }).then(function () {
                return tokoianConn.query(queryLogString, [[[user, 'Sales Order Dihapus', logString, dateNow]]]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Sales Order dihapus.!", "color": "red"};

                if (curUrl === '/recap-sales-order'){
                    res.redirect('/recap-sales-order')
                } else {
                    res.redirect('/so-customer-list')
                }
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }else if (!_.isUndefined(req.body.prosesSoSubmit)) {
        let stock;
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(recapSoMainQry, [[req.body.prosesSoid]]);
            }).then(function (row) {
                rows = row;
                // console.log(row);
                var cekStock = new Promise(function (resolve, reject) {
                    resolve(_.find(row, function (r) {
                        return r.sisastock < 0;
                    }))
                });

                return cekStock.then(function (resCheckStock){
                    stock = resCheckStock;
                });
            }).then(function () {
                if (!_.isEmpty(stock) || !_.isUndefined(stock)) {
                    req.session.message = {"text": "Sales Order gagal diproses, stock kurang.!", "color": "red"};
                    tokoianConn.query("ROLLBACK;").then(() => {
                        console.error(printDateNow() + error);
                    });
                    if (curUrl === '/recap-sales-order'){
                        res.redirect('/recap-sales-order')
                    } else {
                        res.redirect('/so-customer-list')
                    }
                    return Promise.reject(dateNow +  " - Sales Order gagal diproses, stock kurang.!");
                }
            }).then(function () {
                return Promise.each(rows, function (itemRow) {
                    // console.log(typeof itemRow.jumlah);
                    var jumlah = parseInt(itemRow.jumlah); //so jumlah
                    var stock = parseInt(itemRow.stock); //item jumlah
                    var hargaJual = parseInt(itemRow.hargajual);
                    var sisaStock = (stock - jumlah);

                    // sisaStock = (stock - jumlah);
                    // console.log(sisaStock);
                    queryItemString = "UPDATE item SET " +
                        "jumlah = ? " +
                        "where idkode = ? ";

                    querySoString = "UPDATE salesorder SET " +
                        "status = 'Done' " +
                        "where soid = ? ";

                    arrItemQry.push([itemRow.idkode, itemRow.soid, hargaJual, dateNow, '2', jumlah]);

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.customer + "\n" +
                        "Alamat Toko : " + itemRow.alamat + "\n" +
                        "Kode Barang : " + itemRow.kode + "\n" +
                        "Nama Barang : " + itemRow.namaitem + "\n" +
                        "Jumlah : " + itemRow.jumlah + "\n" +
                        "Harga Beli : " + itemRow.hargabeli + "\n" +
                        "Harga Jual : " + itemRow.hargajual;

                    arrLogQry.push([user, 'Proses SO to DO', logString, dateNow]);

                    return tokoianConn.query(queryItemString, [sisaStock, itemRow.idkode])
                        .then(function () {
                            return tokoianConn.query(querySoString, [itemRow.soid]);
                        }).catch(function (error) {
                            req.session.message = {"text": "Proses SO Gagal :"+ error, "color": "red-text"};
                            tokoianConn.query("ROLLBACK;").then(() => {
                                console.error(printDateNow() + error);
                            });
                            if (curUrl === '/recap-sales-order'){
                                res.redirect('/recap-sales-order')
                            } else {
                                res.redirect('/so-customer-list')
                            }
                            //logs out the error
                            return Promise.reject(dateNow +  " - Proses SO Gagal :"+ error);
                        });
                });
            }).then(function () {
                queryTrxString = "INSERT INTO trx (idkode, orderid, hargajual, tanggal, jenistrx, jumlah) VALUES ?";
                return tokoianConn.query(queryTrxString, [arrItemQry]);
            }).then(function () {
                queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ?";
                return tokoianConn.query(queryLogString, [arrLogQry]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Sales Order diproses.!", "color": "green"};
                if (curUrl === '/recap-sales-order'){
                    res.redirect('/recap-sales-order')
                } else {
                    res.redirect('/so-customer-list')
                }
            }).catch(function (error) {
                req.session.message = {"text": "Proses SO Gagal :"+ error, "color": "red-text"};
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                // let message = {"text": "Proses SO Gagal :"+ error, "color": "red-text"};
                // if (curUrl === '/recap-sales-order'){
                //     getPage.recapSO(message, req, res);
                // } else {
                //     getPage.soCust(message, req, res);
                // }
                // //logs out the error
                // return Promise.reject("Proses SO Gagal :"+ error);
            });
    }else if (!_.isUndefined(req.body.reopenSoBtn)) {
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(recapSoMainQry, [[req.body.prosesSoid]]);
            }).then(function (row) {
                // console.log(row);
                return Promise.each(row, function (itemRow) {
                    // console.log(typeof itemRow.jumlah);
                    var jumlah = parseInt(itemRow.jumlah);
                    var stock = parseInt(itemRow.stock);
                    var hargaJual = parseInt(itemRow.hargajual);
                    var sisaStock;

                    sisaStock = (stock + jumlah);
                    // console.log(sisaStock);

                    queryItemString = "UPDATE item SET " +
                        "jumlah = ? " +
                        "where idkode = ? ";

                    querySoString = "UPDATE salesorder SET " +
                        "status = 'Open' " +
                        "where soid = ? ";

                    arrItemQry.push([itemRow.idkode, itemRow.soid, hargaJual, dateNow, '3', jumlah]);

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.customer + "\n" +
                        "Alamat Toko : " + itemRow.alamat;

                    arrLogQry.push([user, 'Reopen SO', logString, dateNow]);

                    return tokoianConn.query(queryItemString, [sisaStock, itemRow.idkode])
                        .then(function () {
                            return tokoianConn.query(querySoString, [itemRow.soid]);
                        }).catch(function (error) {
                            tokoianConn.query("ROLLBACK;").then(() => {
                                console.error(printDateNow() + error);
                            });
                            req.session.message = {"text": "Sales Order gagal reopen.!", "color": "red-text"};
                            // console.log(curUrl);
                            if (curUrl === '/recap-sales-order'){
                                res.redirect('/recap-sales-order')
                            } else {
                                res.redirect('/so-customer-list')
                            }
                            //logs out the error
                            return Promise.reject("Proses Reopen SO Gagal :"+ error);
                        });
                });
            }).then(function () {
                queryTrxString = "INSERT INTO trx (idkode, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES ?";
                return tokoianConn.query(queryTrxString, [arrItemQry]);
            }).then(function () {
                queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES ?";
                return tokoianConn.query(queryLogString, [arrLogQry]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Sales Order repoen.!", "color": "green"};

                if (curUrl === '/recap-sales-order'){
                    res.redirect('/recap-sales-order')
                } else {
                    res.redirect('/so-customer-list')
                }
            }).catch(function (error) {
                req.session.message = {"text": "Sales Order gagal reopen.!", "color": "red-text"};
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
            });
    //logs out the error
    }else if (!_.isUndefined(req.body.printSoBtn)) {
        let soid, row;
        let logStringArr = [];
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(recapSoMainQry, [[req.body.prosesSoid]]);
            }).then(function (rows) {
            // console.log(row);
                row = rows;
                querySoString = "UPDATE salesorder SET " +
                    "printed = '1', " +
                    "userprinted = ?, " +
                    "dateprinted = ? " +
                    "where soid = ? ";

                let logString = "Sales Order ID : " + row[0].soid + "\n" +
                    "Nama Toko : " + row[0].kode + "\n" +
                    "Alamat Toko : " + row[0].nama;

                logStringArr.push([user, 'Print DO', logString, dateNow]);
            }).then(function () {
                soid = row[0].soid;
                // console.log(soid);
                var soPush = tokoianConn.query(querySoString, [user, dateNow, soid]);
            }).then(function () {
                logPush = tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [logStringArr] );
            }).then(function () {
                let string = encrypt(soid);
                res.redirect('/print-do?so=' + string);
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    }
});

/* GET customer SO. */
router.get('/so-customer-list', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.soCust(message, req, res);
});

/* GET trx-out page. */
router.get('/trxout-report', function(req, res) {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    var queryString = "select *, (hargajual*jumlah) total from trx " +
        "LEFT JOIN kode ON trx.idkode = kode.idkode " +
        "where (jenistrx = '2' OR jenistrx = '5') AND " +
        "MONTH(trx.tanggal) = '" + dateMonth + "' " +
        "AND YEAR(trx.tanggal) = '" + dateYear + "' " +
        "order by trx.tanggal";
    tokoianConn.query(queryString)
        .then(function (rowItem) {
            var groupedOrderid = _.groupBy(rowItem, 'orderid');

            res.render('trxout-report', {
                template: groupedOrderid,
                rows: rowItem,
                grandTotal: _.sumBy(rowItem, 'total')
            });
        }).catch(function (error) {
        //logs out the error
        console.error(printDateNow() + error);
    });
});

/* POST trx-out page. */
router.post('/trxout-report', function(req, res) {
    var postDate = req.body.periode;

    if (_.isEmpty(postDate.start)) {
        res.redirect('/trxout-report');
    } else {
        var startDate = moment(new Date(postDate.start)).format("YYYY-MM-DD 00:00:00");
        var endDate = moment(new Date(postDate.end)).format("YYYY-MM-DD 23:59:59");
        var message = {'text': "", 'color': ""};
        var filterDate = {
            'start': moment(new Date(postDate.start)).format("DD MMMM, YYYY"),
            'end': moment(new Date(postDate.end)).format("DD MMMM, YYYY")
        };
        var queryString = "select *, (hargajual*jumlah) total from trx " +
            "LEFT JOIN kode ON trx.idkode = kode.idkode " +
            "where (jenistrx = '2' OR jenistrx = '5') AND " +
            "trx.tanggal between '" + startDate + "' " +
            "AND '" + endDate + "' " +
            "order by trx.tanggal";
        tokoianConn.query(queryString)
            .then(function (rowItem) {
                if (!_.isEmpty(rowItem)) {
                    var groupedOrderid = _.groupBy(rowItem, 'orderid');
                    res.render('trxout-report', {
                        template: groupedOrderid,
                        rows: rowItem,
                        grandTotal: _.sumBy(rowItem, 'total'),
                        filterDate: filterDate
                    });
                } else {
                    message = {'text': "Tidak ada laporan di tanggal yang dipilih..", 'color': "red"};
                    res.render('trxout-report', {
                        message: message,
                        grandTotal: 0,
                        filterDate: filterDate
                    });
                }
            }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
    }
});

/* GET income page. */
router.get('/income-report', function(req, res) {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    var grandTotalJual = 0;
    var grandTotalBeli = 0;
    var grandTotalEdit = 0;
    var grandTotalExp = 0;
    var grandTotalDelExp = 0;
    var groupedOrderid, rows;
    var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from trx " +
        "LEFT JOIN kode ON trx.idkode = kode.idkode " +
        "WHERE " +
        "MONTH(trx.tanggal) = '" + dateMonth + "' " +
        "AND YEAR(trx.tanggal) = '" + dateYear + "' " +
        "order by trx.tanggal";
    console.log(queryString);
    tokoianConn.query(queryString)
        .then(function (rowItem) {
            rows = rowItem;
            groupedOrderid = _.groupBy(rows, 'orderid');
            //PEMBELIAN = minus
            var promisePembelian = new Promise(function (resolve, reject) {
                resolve(_.filter(rows, {'jenistrx': 1}));
            });

            promisePembelian.then(function (rowPembelian) {
                grandTotalBeli = (_.isNumber(_.sumBy(rowPembelian, 'totalbeli'))) ? _.sumBy(rowPembelian, 'totalbeli') : 0;

            });
        }).then(function () {
            //PENJUALAN = plus
            var promisePenjualan = new Promise(function (resolve, reject) {
                resolve(_.filter(rows, {'jenistrx': 2}));
            });

            promisePenjualan.then(function (rowPenjualan) {
                grandTotalJual = (_.isNumber(_.sumBy(rowPenjualan, 'totaljual'))) ? _.sumBy(rowPenjualan, 'totaljual') : 0;

            });
        }).then(function () {
            //REOPEN SO = minus
            var promiseEditStock = new Promise(function (resolve, reject) {
                resolve(_.filter(rows, {'jenistrx': 3}));
            });

            promiseEditStock.then(function (rowEditStock) {
                grandTotalEdit = (_.isNumber(_.sumBy(rowEditStock, 'totalbeli'))) ? _.sumBy(rowEditStock, 'totalbeli') : 0;
                //console.log(grandTotalEdit);

            });
        }).then(function () {
            //ADD EXPENSE = minus
            var promiseAddExp = new Promise(function (resolve, reject) {
                resolve(_.filter(rows, {'jenistrx': 4}));
            });

            promiseAddExp.then(function (rowAddExp) {
                grandTotalExp = (_.isNumber(_.sumBy(rowAddExp, 'totalbeli'))) ? _.sumBy(rowAddExp, 'totalbeli') : 0;
                //console.log(grandTotalEdit);

            });
        }).then(function () {
            //delete EXPENSE = plus
            var promiseDeleteExp = new Promise(function (resolve, reject) {
                resolve(_.filter(rows, {'jenistrx': 5}));
            });

            promiseDeleteExp.then(function (rowDeleteExp) {
                grandTotalDelExp = (_.isNumber(_.sumBy(rowDeleteExp, 'totaljual'))) ? _.sumBy(rowDeleteExp, 'totaljual') : 0;
            });
        }).then(function () {
        // console.log(grandTotalDelExp);
            res.render('income-report', {
                rows: rows,
                template: groupedOrderid,
                grandTotalJual: (grandTotalJual + grandTotalDelExp),
                grandTotalBeli: (grandTotalBeli + grandTotalEdit + grandTotalExp),
                totalLaba: ((grandTotalJual + grandTotalDelExp) - (grandTotalBeli + grandTotalEdit + grandTotalExp))
            });

        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});

/* POST income page. */
router.post('/income-report', function(req, res) {
    var grandTotalJual = 0;
    var grandTotalBeli = 0;
    var grandTotalEdit = 0;
    var grandTotalExp = 0;
    var grandTotalDelExp = 0;
    var groupedOrderid, rows;
    var postDate = req.body.periode;
    if (_.isEmpty(postDate.start)) {
        res.redirect('/income-report');
    } else {
        var startDate = moment(new Date(postDate.start)).format("YYYY-MM-DD 00:00:00");
        var endDate = moment(new Date(postDate.end)).format("YYYY-MM-DD 23:59:59");
        var message = {'text': "", 'color': ""};
        var filterDate = {
            'start': moment(new Date(postDate.start)).format("DD MMMM, YYYY"),
            'end': moment(new Date(postDate.end)).format("DD MMMM, YYYY")
        };
        var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from trx " +
            "LEFT JOIN kode ON trx.idkode = kode.idkode " +
            "WHERE " +
            "trx.tanggal between '" + startDate + "' " +
            "AND '" + endDate + "' " +
            "order by trx.tanggal";
        tokoianConn.query(queryString)
            .then(function (rowItem) {
                rows = rowItem;
                groupedOrderid = _.groupBy(rows, 'orderid');
                //PEMBELIAN = minus
                var promisePembelian = new Promise(function (resolve, reject) {
                    resolve(_.filter(rows, {'jenistrx': 1}));
                });

                promisePembelian.then(function (rowPembelian) {
                    grandTotalBeli = (_.isNumber(_.sumBy(rowPembelian, 'totalbeli'))) ? _.sumBy(rowPembelian, 'totalbeli') : 0;

                });
            }).then(function () {
                //PENJUALAN = plus
                var promisePenjualan = new Promise(function (resolve, reject) {
                    resolve(_.filter(rows, {'jenistrx': 2}));
                });

                promisePenjualan.then(function (rowPenjualan) {
                    grandTotalJual = (_.isNumber(_.sumBy(rowPenjualan, 'totaljual'))) ? _.sumBy(rowPenjualan, 'totaljual') : 0;

                });
            }).then(function () {
                //REOPEN SO = minus
                var promiseEditStock = new Promise(function (resolve, reject) {
                    resolve(_.filter(rows, {'jenistrx': 3}));
                });

                promiseEditStock.then(function (rowEditStock) {
                    grandTotalEdit = (_.isNumber(_.sumBy(rowEditStock, 'totalbeli'))) ? _.sumBy(rowEditStock, 'totalbeli') : 0;
                    //console.log(grandTotalEdit);

                });
            }).then(function () {
                //ADD EXPENSE = minus
                var promiseAddExp = new Promise(function (resolve, reject) {
                    resolve(_.filter(rows, {'jenistrx': 4}));
                });

                promiseAddExp.then(function (rowAddExp) {
                    grandTotalExp = (_.isNumber(_.sumBy(rowAddExp, 'totalbeli'))) ? _.sumBy(rowAddExp, 'totalbeli') : 0;
                    //console.log(grandTotalEdit);

                });
            }).then(function () {
                //delete EXPENSE = plus
                var promiseDeleteExp = new Promise(function (resolve, reject) {
                    resolve(_.filter(rows, {'jenistrx': 5}));
                });

                promiseDeleteExp.then(function (rowDeleteExp) {
                    grandTotalDelExp = (_.isNumber(_.sumBy(rowDeleteExp, 'totaljual'))) ? _.sumBy(rowDeleteExp, 'totaljual') : 0;
                });
            }).then(function () {
                if (!_.isEmpty(rows)) {
                    res.render('income-report', {
                        rows: rows,
                        template: groupedOrderid,
                        grandTotalJual: (grandTotalJual + grandTotalDelExp),
                        grandTotalBeli: (grandTotalBeli + grandTotalEdit + grandTotalExp),
                        totalLaba: ((grandTotalJual + grandTotalDelExp) - (grandTotalBeli + grandTotalEdit + grandTotalExp)),
                        filterDate: filterDate
                    });
                } else {
                    message = {'text': "Tidak ada laporan di tanggal yang dipilih", 'color': "red"};
                    res.render('income-report', {
                        message: message,
                        grandTotalJual: 0,
                        grandTotalBeli: 0,
                        totalLaba: 0,
                        filterDate: filterDate
                    });

                }
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
            });
    }
});

/* GET log page. */
router.get('/log', function(req, res) {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    let periode = req.query.start || {};
    let perpage = 50;
    let thisUrlPath = "/log";
    let qryLogStr = "";

    if (!_.isEmpty(periode)){
        qryLogStr = "select * from log where " +
            "tanggal between '" + decrypt(req.query.start) + "' " +
            "AND '" + decrypt(req.query.end) + "' " +
            "order by tanggal DESC";

        tokoianConn.query(qryLogStr)
            .then(function (rowItem) {
                let totalPage = Math.ceil(_.size(rowItem)/perpage);
                let page = (!req.query.p || ((req.query.p > totalPage)||(req.query.p < 1)))?1:parseInt(decrypt(req.query.p), 10);
                let prevPage = page-1;
                let nextPage = page+1;
                let startRow = (page - 1)*perpage;
                let pagination = [];
                let prevLink = {
                    "disabled" : (page <= 1) ? "disabled" : "",
                    "waves" : (page <= 1) ? "" : "waves-effect",
                    "link": (page <= 1) ? "": "href = '"+thisUrlPath+"?p=" + encrypt(""+prevPage)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                };
                let nextLink = {
                    "disabled" : (page === totalPage) ? "disabled" : "",
                    "waves" : (page === totalPage) ? "" : "waves-effect",
                    "link": (page >= totalPage) ? "" : "href = '"+thisUrlPath+"?p=" + encrypt(""+nextPage)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                };

                let template = "";

                if (totalPage >= 10){
                    for (let i = 1; i <= totalPage; i++) {
                        if(page <= 5 && page > 0){
                            if(i <= 10){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                                };
                            }
                        }else if (page > 5 && page < totalPage-5){
                            if(i >= (page-5) && i <= (page+5)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                                };
                            }
                        }else if (page >= totalPage-5){
                            if(i >= (totalPage-10)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                                };
                            }
                        }
                    }
                }else{
                    for (let i = 1; i <= totalPage; i++) {
                        pagination[i] = {
                            "active" : (i === page)? "active": "waves-effect",
                            "value" : i,
                            "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
                        };
                    }
                }

                let qryLogPageStr = "select * from log where " +
                    "tanggal between '" + decrypt(req.query.start) + "' " +
                    "AND '" + decrypt(req.query.end) + "' " +
                    "order by tanggal DESC LIMIT "+ perpage +" OFFSET "+ startRow;
                tokoianConn.query(qryLogPageStr)
                    .then(function (rowLogs) {
                        res.render('log', {
                            rows: rowLogs,
                            pagination: pagination,
                            prevLink: prevLink,
                            nextLink: nextLink
                        });
                    }).catch(function (error) {
                    //logs out the error
                    console.error(printDateNow() + error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
    }else{
        qryLogStr = "select * from log where " +
            "MONTH(tanggal) = '" + dateMonth + "' " +
            "AND YEAR(tanggal) = '" + dateYear + "' " +
            "order by tanggal DESC";

        tokoianConn.query(qryLogStr)
            .then(function (rowItem) {
                let totalPage = Math.ceil(_.size(rowItem)/perpage);
                let page = (!req.query.p || ((req.query.p > totalPage)||(req.query.p < 1)))?1:parseInt(decrypt(req.query.p), 10);
                let prevPage = page-1;
                let nextPage = page+1;
                let startRow = (page - 1)*perpage;
                let pagination = [];
                let prevLink = {
                    "disabled" : (page <= 1) ? "disabled" : "",
                    "waves" : (page <= 1) ? "" : "waves-effect",
                    "link": (page <= 1) ? "": "href = '"+thisUrlPath+"?p=" + encrypt(""+prevPage)+"'"
                };
                let nextLink = {
                    "disabled" : (page === totalPage) ? "disabled" : "",
                    "waves" : (page === totalPage) ? "" : "waves-effect",
                    "link": (page >= totalPage) ? "" : "href = '"+thisUrlPath+"?p=" + encrypt(""+nextPage)+"'"
                };

                let template = "";

                if(totalPage >= 10){
                    for (let i = 1; i <= totalPage; i++) {
                        if(page <= 5 && page > 0){
                            if(i <= 10){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)
                                };
                            }
                        }else if (page > 5 && page < totalPage-5){
                            if(i >= (page-5) && i <= (page+5)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)
                                };
                            }
                        }else if (page >= totalPage-5){
                            if(i >= (totalPage-10)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
                                };
                            }
                        }
                    }
                }else{
                    for (let i = 1; i <= totalPage; i++) {
                        pagination[i] = {
                            "active" : (i === page)? "active": "waves-effect",
                            "value" : i,
                            "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
                        };
                    }
                }

                let qryLogPageStr = "select * from log where " +
                    "MONTH(tanggal) = '" + dateMonth + "' " +
                    "AND YEAR(tanggal) = '" + dateYear + "' " +
                    "order by tanggal DESC LIMIT "+ perpage +" OFFSET "+ startRow;

                tokoianConn.query(qryLogPageStr)
                    .then(function (rowLogs) {
                        res.render('log', {
                            rows: rowLogs,
                            pagination: pagination,
                            prevLink: prevLink,
                            nextLink: nextLink
                        });
                    }).catch(function (error) {
                    //logs out the error
                    console.error(printDateNow() + error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
    }

});

/* POST log page. */
router.post('/log', function(req, res) {
    var postDate = req.body.periode;
    let perpage = 50;
    let thisUrlPath = "/log";
    if (_.isEmpty(postDate.start)) {
        res.redirect('/log');
    } else {
        var startDate = moment(new Date(postDate.start)).format("YYYY-MM-DD 00:00:00");
        var endDate = moment(new Date(postDate.end)).format("YYYY-MM-DD 23:59:59");
        var filterDate = {
            'start': moment(new Date(postDate.start)).format("DD MMMM, YYYY"),
            'end': moment(new Date(postDate.end)).format("DD MMMM, YYYY")
        };

        tokoianConn.query("select * from log where " +
            "tanggal between '" + startDate + "' " +
            "AND '" + endDate + "' " +
            "order by tanggal DESC")
            .then(function (rowItem) {
                let totalPage = Math.ceil(_.size(rowItem)/perpage);
                let page = (!req.query.p || ((req.query.p > totalPage)||(req.query.p < 1)))?1:parseInt(decrypt(req.query.p), 10);
                let prevPage = page-1;
                let nextPage = page+1;
                let startRow = (page - 1)*perpage;
                let pagination = [];
                let prevLink = {
                    "disabled" : (page <= 1) ? "disabled" : "",
                    "waves" : (page <= 1) ? "" : "waves-effect",
                    "link": (page <= 1) ? "": "href = '"+thisUrlPath+"?p=" + encrypt(""+prevPage)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                };
                let nextLink = {
                    "disabled" : (page === totalPage) ? "disabled" : "",
                    "waves" : (page === totalPage) ? "" : "waves-effect",
                    "link": (page >= totalPage) ? "" : "href = '"+thisUrlPath+"?p=" + encrypt(""+nextPage)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                };

                let template = "";

                if(totalPage >= 10){
                    for (let i = 1; i <= totalPage; i++) {
                        if(page <= 5 && page > 0){
                            if(i <= 10){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                                };
                            }
                        }else if (page > 5 && page < totalPage-5){
                            if(i >= (page-5) && i <= (page+5)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                                };
                                pagination[totalPage - 1] = {
                                    "active" : "disabled",
                                    "value" : ". . .",
                                    "link" : ""
                                };
                                pagination[totalPage] = {
                                    "active" : (totalPage === page)? "active": "waves-effect",
                                    "value" : totalPage,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+totalPage)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                                };
                            }
                        }else if (page >= totalPage-5){
                            if(i >= (totalPage-10)){
                                pagination[i] = {
                                    "active" : (i === page)? "active": "waves-effect",
                                    "value" : i,
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                                };
                            }
                        }
                    }
                }else{
                    for (let i = 1; i <= totalPage; i++) {
                        pagination[i] = {
                            "active" : (i === page)? "active": "waves-effect",
                            "value" : i,
                            "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
                        };
                    }
                }

                tokoianConn.query("select * from log where " +
                    "tanggal between '" + startDate + "' " +
                    "AND '" + endDate + "' " +
                    "order by tanggal DESC LIMIT "+ perpage +" OFFSET "+ startRow)
                    .then(function (rowLogs) {
                        res.render('log', {
                            rows: rowLogs,
                            filterDate: filterDate,
                            pagination: pagination,
                            prevLink: prevLink,
                            nextLink: nextLink
                        });
                    }).catch(function (error) {
                    //logs out the error
                    console.error(printDateNow() + error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });

    }
});

/* GET print sales order page. */
router.get('/print-do', function(req, res) {
    var passedVariable = decrypt(req.query.so) || {};
    var row;
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
        "where so.soid = ? " +
        // "where so.soid = '#SO-zTf1900002' " +
        "order by so.status desc, so.tanggal desc", [passedVariable])
        .then(function (rows) {
            row = rows;
            // console.log(row[0].soid);
            return tokoianConn.query("select * from company");
        }).then(function (company) {
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
            res.render('print-do', {
                rows: groupBySoid,
                company: company,
                title: row[0].soid,
                grandTotal: grandTotal

            });
        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});

/* GET print sales order page. */
router.get('/print-so', function(req, res) {
    var passedVariable = decrypt(req.query.so) || {};
    var row;
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
        "where so.soid = ? " +
        // "where so.soid = '#SO-zTf1900002' " +
        "order by so.status desc, so.tanggal desc", [passedVariable])
        .then(function (rows) {
            row = rows;
            // console.log(row[0].soid);
            return tokoianConn.query("select * from company");
        }).then(function (company) {
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
            res.render('print-so', {
                rows: groupBySoid,
                company: company,
                title: row[0].soid,
                grandTotal: grandTotal

            });
        }).catch(function (error) {
            //logs out the error
            console.error(printDateNow() + error);
        });
});

/* GET add sales order page. */
router.get('/add-expense', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.expense(message, req, res);
});

/* POST add sales order page. */
router.post('/add-expense', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postOrder = req.body.addExpense || {};
    let queryItemString = [];
    let queryTrxString = [];
    let queryLogString = [];
    if (!_.isUndefined(req.body.addExpenseSubmit)){
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return Promise.each(postOrder, function (expense) {
                    let nominal = parseInt(expense.nominal.replace(/[^0-9]/gi, ''));
                    queryItemString.push([expense.nama, expense.orderid, nominal, dateNow]);
                    queryTrxString.push([expense.nama, expense.orderid, nominal, dateNow, '4', '1']);

                    let logString = "Order ID : " + expense.orderid + "\n" +
                        "Deskripsi Pengeluaran : " + expense.nama + "\n" +
                        "Nominal : " + expense.nominal;

                    queryLogString.push([user, 'Input Pengeluaran', logString, dateNow]);
                });
            }).then(() => {
                return tokoianConn.query("INSERT INTO expense (nama, orderid, nominal, tanggal) VALUES ?", [queryItemString]);
            }).then(() => {
                return tokoianConn.query("INSERT INTO trx (expense, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES ?", [queryTrxString]);
            }).then(() => {
                return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [queryLogString]);
            }).then(() => {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Tambah expense berhasil.", "color": "green"};
                res.redirect('/add-expense');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                    let message = {"text": error, "color": "red"};
                    getPage.expense(message, req, res);
                });
                //logs out the error
            });
    }
});

/* GET recap-expense page. */
router.get('/recap-expense', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.recapExpense(message, req, res);
});

/* POST recap expense. */
router.post('/recap-expense', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let queryExpStr = "";
    let queryTrxStr = "";
    let arrayTrxQry = [];
    let queryLogString = [];
    if (!_.isUndefined(req.body.hapusEpxBtn)) { //DELETE SO
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query("select * " +
                    "from expense " +
                    "where orderid = ?", [req.body.deletedExpId]);
            }).then(function (rows) {
                return Promise.each(rows, function (exprow) {
                    arrayTrxQry.push([exprow.nama, exprow.orderid, exprow.nominal, dateNow, '5', '1']);
                });
            }).then(() => {
                queryTrxStr = "INSERT INTO trx (expense, orderid, hargajual, tanggal, jenistrx, jumlah) VALUES?";
                return tokoianConn.query(queryTrxStr, [arrayTrxQry]);
            }).then(() => {
                queryExpStr = "UPDATE expense SET status='0' WHERE orderid = ?";
                return tokoianConn.query(queryExpStr, [req.body.deletedExpId]);
            }).then(() => {
                let logString = "Expense ID : " + req.body.deletedExpId;
                queryLogString.push([user, 'Expense Dihapus', logString, dateNow]);
                return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [queryLogString]);
            }).then(() => {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Hapus Expense Berhasil.", "color": "green"};
                res.redirect('/recap-expense');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                    req.session.message = {"text": "Hapus Expense gagal." + error, "color": "red"};
                    res.redirect('/recap-expense');
                });
                //logs out the error
            });
    }
});

/* GET pricelist. */
router.get('/pl-customer-list', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.pricelist(message, req, res);
});

/* POST pricelist. */
router.post('/pl-customer-list', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postPl = req.body.editPl;
    let idkode = decrypt(req.body.editPlBtn);
    let hargajual = parseInt(postPl.hargajual.replace(/[^0-9]/gi, ''));
    let queryPlString = "";
    let queryPlData = [];
    if (!_.isUndefined(req.body.editPlBtn)) {
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query("select * " +
                    "from pricelist " +
                    "where " +
                    "idcustomer = ? and " +
                    "idkode = ?", [postPl.customer, idkode]);
            }).then(function (rows) {
                // console.log(rows);
                if (!_.isEmpty(rows)) {
                    queryPlString = "UPDATE pricelist SET " +
                        "hargajual = ? " +
                        "where " +
                        "idcustomer = ? and " +
                        "idkode = ?";
                    queryPlData = [parseInt(postPl.hargajual.replace(/[^0-9]/gi, '')), rows[0].idcustomer, rows[0].idkode];
                }else {
                    queryPlString = "INSERT INTO pricelist (idcustomer, idkode, hargajual) VALUES ?";
                        queryPlData = [[[postPl.customer, idkode, hargajual]]];
                }
                return tokoianConn.query(queryPlString, queryPlData);
            }).then(function () {
                let logString = "Nama Toko : " + postPl.namatoko + "\n" +
                    "Kode Barang : " + postPl.namabarang + "\n" +
                    "Nama Barang : " + postPl.kodebarang + "\n" +
                    "Harga Jual Lama : " + Intl.NumberFormat('en-IND').format(postPl.hargajuallama)+ "\n" +
                    "Harga Jual Baru : " + postPl.hargajual;

                    let queryLogString = [user, 'Edit Pricelist', logString, dateNow];
                return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [[queryLogString]]);
            }).then(function () {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Update pricelist berhasil.", "color": "green"};
                res.redirect('/pl-customer-list?so='+ encrypt(postPl.customer) );
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }
});

/* GET code-list page. */
router.get('/user-manager', function(req, res) {
    var message = {"text": "", "color": ""};
    getPage.userman(message, req, res);
});

/* POST add-code page. */
router.post('/user-manager', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postUser = req.body.addUser;
    var arrayUserQuery = [];
    var arrayLogQuery = [];
    let dataedit =[];
    // console.log(req.body.addUser);
    if (!_.isUndefined(req.body.addUserSubmit)){
        arrayUserQuery.push([postUser.username, postUser.nama, encrypt(postUser.password), postUser.priv, postUser.status]);

        let logString = "Username : " + postUser.username + "\n" +
            "Nama : " + postUser.nama + "\n" +
            "Privilege : " + (postUser.priv === '1')? "Administrator": "Operator" + "\n";

        arrayLogQuery.push([user, "Tambah User Baru", logString, dateNow]);
        // console.log(arrayUserQuery);
        var queryUserString = "INSERT INTO user (username, nama, password, priv, status) VALUES?";
        var queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                return tokoianConn.query(queryUserString, [arrayUserQuery]);
            }).then(() => {
                return tokoianConn.query(queryLogString, [arrayLogQuery]);
            }).then(() => {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Tambah user berhasil.", "color": "green"};
                res.redirect('/user-manager');
            }).catch(function (error) {
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
                //logs out the error
            });
    }else if (!_.isUndefined(req.body.editUserSubmit)){
        return tokoianConn.query("START TRANSACTION;")
            .then(() => {
                var updateUser = "UPDATE user SET " +
                    "nama =  ?, " +
                    "username =  ?, " +
                    "password =  ? " +
                    "where iduser = ?";
                return tokoianConn.query(updateUser, [req.body.editUser.nama, req.body.editUser.username, encrypt(req.body.editUser.password), decrypt(req.body.editUserSubmit)]);
            }).then(() => {
                let logString = "Username : " + req.body.editUser.usernameOld + "\n" +
                    "Nama : " + req.body.editUser.namaOld + "\n" +
                    "Updated to :\n " +
                    "Username : " + req.body.editUser.username + "\n" +
                    "Nama : " + req.body.editUser.namaOld;
                var insertLog = [user, 'Edit Detail User', logString, dateNow];
                return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [[insertLog]]);
            }).then(() => {
                return tokoianConn.query("COMMIT;");
            }).then(() => {
                req.session.message = {"text": "Edit user berhasil.", "color": "green"};
                res.redirect('/user-manager');
            }).catch(function (error) {
                //logs out the error
                console.error(printDateNow() + error);
                req.session.message = {"text": "Edit user gagal.! Error : "+ error, "color": "red"};
                res.redirect('/user-manager');
                return tokoianConn.query("ROLLBACK;").then(() => {
                    console.error(printDateNow() + error);
                });
            });
    }
});

/* GET AJAX user-list page. */
router.get('/priv-user', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var iduser = decrypt(req.query.priv) || {};
    var updatePriv = "UPDATE user SET priv =  ? where iduser = ?";
    let listUser;
    // console.log(updatePriv);
    return tokoianConn.query("START TRANSACTION;")
        .then(() => {
            return tokoianConn.query("select * from user where iduser = '" + iduser + "'");
        }).then(function (listUsers) {
            listUser = listUsers;
            return tokoianConn.query(updatePriv, [passedVariable, iduser]);
        }).then(function () {
            let changePriv = (passedVariable === '1')? "Administrator" : "Operator";
            var logString = "User Name : " + listUser[0].username + "\n" +
                "Nama : " + listUser[0].nama + "\n" +
                "Privilege to : " + changePriv + "\n";
            var insertLog =  [user, 'Edit Privilege', logString, dateNow];
            return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [[insertLog]]);
        }).then(function () {
            return tokoianConn.query("COMMIT;");
        }).then(() => {
                res.send("ok");

        }).catch(function (error) {
            return tokoianConn.query("ROLLBACK;").then(() => {
                console.error(printDateNow() + error);
            });
            //logs out the error
        });
});

/* GET AJAX user-list page. */
router.get('/user-status', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var iduser = decrypt(req.query.priv) || {};
    var updatePriv = "UPDATE user SET status =  ? where iduser = ?";
    let listUser;

    // console.log(updatePriv);
    return tokoianConn.query("START TRANSACTION;")
        .then(() => {
            return tokoianConn.query("select * from user where iduser = '" + iduser + "'");
        }).then(function (listUsers) {
            listUser = listUsers;
            return tokoianConn.query(updatePriv, [passedVariable, iduser]);
        }).then(function () {
            let changeStatus = (passedVariable === '1')? "Active" : "Deactive";
            var logString = "User Name : " + listUser[0].username + "\n" +
                "Nama : " + listUser[0].nama + "\n" +
                "Status to : " + changeStatus + "\n";
            var insertLog =  [user, 'Edit Status', logString, dateNow];
            return tokoianConn.query("INSERT INTO log (user, aksi, detail, tanggal) VALUES ?", [[insertLog]]);
        }).then(function () {
            return tokoianConn.query("COMMIT;");
        }).then(() => {
                res.send("ok");

        }).catch(function (error) {
            return tokoianConn.query("ROLLBACK;").then(() => {
                console.error(printDateNow() + error);
            });
            //logs out the error
        });
});

/* GET logout page. */
router.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        res.redirect('/login-auth');
    })
});

router.use(function (err, req, res, next) {
    if (err) {
        console.log('Error', err);
    } else {
        console.log('404')
    }
});

module.exports = router;
