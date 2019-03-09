var express     = require('express');
var router      = express.Router();
var _           = require('lodash');
var mysql       = require('promise-mysql');
var Promise     = require('bluebird');
var moment      = require('moment');
var randomize   = require('randomatic');
var querystring = require('querystring');

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

/* GET home page. */
router.get('/', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable = req.query.respost;
        var message = {"text":"","color":""};
        switch (passedVariable){
            case '1':
                message = {"text":"Transaksi Berhasil..", "color":"green"};
                break;
            case '2':
                message = {"text":"Transaksi Gagal..!!", "color":"red"};
                break;
            default :
                message = {"text":"","color":""};
                break;
        }
        res.render('index',{
            message : message
        });
    }
});

/* POST home page. */
router.post('/', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        var lists = Array.prototype.slice.call(req.body.listTrx);
        var user = req.session.name;
        var orderid = randomize('?Aa0',10,dateNow);
        var newStock = 0;
        var queryItemString = [];
        var arrayTrxQuery = [];
        var arrayLogQuery = [];
        var ongkos = 0;
        var lain = 0;

        console.log(req.body.other);

        if(!_.isEmpty(req.body.other.lain) && !_.isEmpty(req.body.other.ongkos)){
            lain = parseInt(req.body.other.lain.replace(/[^0-9]/gi, ''));
            ongkos = parseInt(req.body.other.ongkos.replace(/[^0-9]/gi, ''));
        }else if(!_.isEmpty(req.body.other.ongkos)){
            ongkos = parseInt(req.body.other.ongkos.replace(/[^0-9]/gi, ''));
        }else if(!_.isEmpty(req.body.other.lain)) {
            lain = parseInt(req.body.other.lain.replace(/[^0-9]/gi, ''));
        }

        var queryStr = "select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode";
        return bandotcomConn.query(queryStr)
            .then(function(rowItem) {
                return Promise.each(lists, function (listStock) {
                    var cekKodePromise = new Promise(function (resolve, reject) {
                        resolve(_.find(rowItem, {'kode' : listStock.kode}));
                    });
                    cekKodePromise.then(function(resRows) {
                        //`bengkelb_bandotcom`.`tb_trx` (`orderid`, `idkode`, `hargabeli`, `hargajual`, `tanggal`, `jenistrx`, `jumlah`, `ongkos`, `lain`)
                        //`bengkelb_bandotcom`.`tb_log` (`user`, `aksi`, `detail`, `tanggal`)
                        newStock = (parseInt(resRows.jumlah) - listStock.jumlah);
                        var logString = "Order ID : "+ orderid +"\n" +
                            "ID Kode : "+ resRows.idkode +"\n" +
                            "Kode Barang : "+ resRows.kode +"\n" +
                            "Merek Barang : "+ resRows.merek +"\n" +
                            "Nama Barang : "+ resRows.nama +"\n" +
                            "Jenis Barang : "+ resRows.jenis +"\n" +
                            "Deskripsi Barang : "+ resRows.deskripsi +"\n" +
                            "Catatan Barang : "+ resRows.catatan +"\n" +
                            "Harga Jual : "+ resRows.hargajual +"\n" +
                            "Jumlah : "+ listStock.jumlah +"\n" +
                            "Ongkos : "+ ongkos +"\n" +
                            "Biaya Lain : "+ lain;
                        arrayLogQuery.push([user, "Transaksi Kasir", logString, dateNow]);
                        arrayTrxQuery.push([orderid, resRows.idkode, resRows.hargabeli, resRows.hargajual, dateNow, '2', listStock.jumlah, ongkos, lain]);

                        queryItemString.push("UPDATE bengkelb_bandotcom.tb_item SET " +
                            "jumlah = '"+ newStock  +"' " +
                            "where idkode = '"+ resRows.idkode +"' ");
                    });
                }).then(function () {
                    Promise.all([arrayLogQuery, arrayTrxQuery])
                        .then(function () {
                            var queryTrxString = "INSERT INTO bengkelb_bandotcom.tb_trx (orderid, idkode, hargabeli, hargajual, tanggal, jenistrx, jumlah, ongkos, lain) VALUES?";
                            var queryLogString = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES?";

                            var pushTrx = bandotcomConn.query(queryTrxString, [arrayTrxQuery]);
                            var pushLog = bandotcomConn.query(queryLogString, [arrayLogQuery]);

                            Promise.all([pushTrx, pushLog])
                                .then(function () {
                                    return Promise.each(queryItemString, function (queryItem) {
                                        return bandotcomConn.query(queryItem)
                                            .then(function() {
                                            }).catch(function (error) {
                                                //logs out the error
                                                console.error(error);
                                                var string = encodeURIComponent("2");
                                                res.redirect('/?respost='+ string);
                                            });
                                    }).then(function () {
                                        var string = querystring.stringify({
                                            "respost":"1"});
                                        res.redirect('/?'+ string);
                                    });
                                }).catch(function (error) {
                                    //logs out the error
                                    console.error(error);
                                    var string = encodeURIComponent("2");
                                    res.redirect('/?respost='+ string);
                                });
                        });
                });
            });
    }
});

///* GET add-code page. */
//router.get('/add-code', function(req, res) {
//    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
//        res.redirect('/login-auth');
//    }else {
//        var passedVariable = req.query.respost;
//        var message = {"text": "", "color": ""};
//        switch (passedVariable) {
//            case '1':
//                message = {"text": "Jenis berhasil ditambah..", "color": "green"};
//                break;
//            case '2':
//                message = {"text": "Tambah jenis gagal..!!", "color": "red"};
//                break;
//            default :
//                message = {"text": "", "color": ""};
//                break;
//        }
//        res.render('add-code', {
//            message: message
//        });
//    }
//});
//
///* POST add-code page. */
//router.post('/add-code', function(req, res) {
//    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
//        res.redirect('/login-auth');
//    }else {
//        var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
//        var lists = Array.prototype.slice.call(req.body.listStock);
//        var user = req.session.name;
//        var arrayKodeQuery = [];
//        var arrayItemQuery = [];
//        var arrayLogQuery = [];
//        var num = 1;
//        return bandotcomConn.query("select max(idkode) maxid from tb_kode")
//            .then(function (maxId) {
//                console.log(maxId);
//                return Promise.each(lists, function (listStock) {
//                    //`bengkelb_bandotcom`.`tb_kode` (`idkode`, `kode`, `nama`, `merek`, `jenis`, `deskripsi`, `catatan`)
//                    var maxIdCode = (parseInt(maxId[0].maxid) + num);
//                    //console.log(maxIdCode);
//                    arrayKodeQuery.push([maxIdCode, listStock.kode, listStock.nama, listStock.merek, listStock.jenis, listStock.deskripsi, listStock.catatan]);
//                    arrayItemQuery.push([maxIdCode, "0"]);
//
//                    var logString = "ID Kode : " + maxIdCode + "\n" +
//                        "Kode Barang : " + listStock.kode + "\n" +
//                        "Merek Barang : " + listStock.merek + "\n" +
//                        "Nama Barang : " + listStock.nama + "\n" +
//                        "Jenis Barang : " + listStock.jenis + "\n" +
//                        "Deskripsi Barang : " + listStock.deskripsi + "\n" +
//                        "Catatan Barang : " + listStock.catatan;
//
//                    arrayLogQuery.push([user, "Tambah Jenis Barang", logString, dateNow]);
//                    num++;
//                }).then(function () {
//                    var queryKodeString = "INSERT INTO bengkelb_bandotcom.tb_kode (idkode, kode, nama, merek, jenis, deskripsi, catatan) VALUES?";
//                    var queryItemString = "INSERT INTO bengkelb_bandotcom.tb_item (idkode, jumlah) VALUES?";
//                    var queryLogString = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES?";
//
//                    var pushKode = bandotcomConn.query(queryKodeString, [arrayKodeQuery]);
//                    var pushItem = bandotcomConn.query(queryItemString, [arrayItemQuery]);
//                    var pushLog = bandotcomConn.query(queryLogString, [arrayLogQuery]);
//
//                    Promise.all([pushKode, pushItem, pushLog])
//                        .then(function (results) {
//                            var string = encodeURIComponent("1");
//                            res.redirect('/add-code?respost=' + string);
//                        }).catch(function (error) {
//                            //logs out the error
//                            console.error(error);
//                            var string = encodeURIComponent("2");
//                            res.redirect('/add-code?respost=' + string);
//                        });
//                });
//            });
//    }
//});

/* GET ajax-sending-code page. */
router.get('/sending-code', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        bandotcomConn.query("select * from tb_kode order by kode")
            .then(function (rowKode) {
                res.json(rowKode);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET ajax-sending-code page. */
router.get('/sending-code-content', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable;
        var queryStr;
        if (!_.isEmpty(req.query.id) || !_.isUndefined(req.query.id)) {
            passedVariable = req.query.id;
            queryStr = "select * from tb_kode left join tb_item on tb_kode.idkode = tb_item.idkode where tb_kode.idkode = '" + passedVariable + "' order by kode";
        } else if (!_.isEmpty(req.query.name) || !_.isUndefined(req.query.name)) {
            passedVariable = decodeURI(req.query.name);
            queryStr = "select * from tb_kode left join tb_item on tb_kode.idkode = tb_item.idkode where tb_kode.kode = '" + passedVariable + "' order by kode";
        }
        return bandotcomConn.query(queryStr)
            .then(function (rowItem) {
                res.json(rowItem);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});


/* GET ajax-sending-code page. */
router.get('/sending-content-by-name', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable;
        var queryStr;
        passedVariable = decodeURI(req.query.name);
        queryStr = "select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "WHERE tb_kode.kode = '" + passedVariable + "'" +
            "order by tb_kode.kode";
        return bandotcomConn.query(queryStr)
            .then(function (rowItem) {
                res.json(rowItem);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET ajax-sending-code page. */
router.get('/sending-full-content', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable;
        var queryStr;
        queryStr = "select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode";
        return bandotcomConn.query(queryStr)
            .then(function (rowItem) {
                res.json(rowItem);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET add-stock page. */
router.get('/add-stock', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable = req.query.respost;
        var message = {"text": "", "color": ""};
        switch (passedVariable) {
            case '1':
                message = {"text": "Stock berhasil ditambah..", "color": "green"};
                break;
            case '2':
                message = {"text": "Tambah stock gagal..!!", "color": "red"};
                break;
            default :
                message = {"text": "", "color": ""};
                break;
        }

        bandotcomConn.query("select * from tb_kode order by kode")
            .then(function (rowKode) {
                res.render('add-stock', {
                    message: message,
                    rows: rowKode
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* POST add-stock page. */
router.post('/add-stock', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        //`bengkelb_bandotcom`.`tb_item` (`idkode`, `hargabeli`, `hargajual`, `jumlah`)
        //`bengkelb_bandotcom`.`tb_kode` (`kode`, `nama`, `jenis`, `deskripsi`, `catatan`)

        var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        var lists = Array.prototype.slice.call(req.body.listStock);
        var user = req.session.name;
        var queryItemString;
        var queryTrxString;
        var queryLogString;
        var logString;
        var string = encodeURIComponent("1");
        var num = 1;
        return bandotcomConn.query("select *, tb_kode.idkode as idkode from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode")
            .then(function (rows) {
                return Promise.each(lists, function (listStock) {
                    //console.log(listStock);
                    var cekNamakodePromise = new Promise(function (resolve, reject) {
                        resolve(_.find(rows, {'kode': parseInt(listStock.kode)}));
                    });

                    cekNamakodePromise.then(function (resRows) {
                        var hargaBeli = parseInt(listStock.hargabeli.replace(/[^0-9]/gi, ''));
                        var hargaJual = parseInt(listStock.hargajual.replace(/[^0-9]/gi, ''));
                        var jumlah = parseInt(listStock.jumlah.replace(/[^0-9]/gi, ''));
                        var total;
                        if (!_.isEmpty(resRows) || !_.isUndefined(resRows)) {
                            total = (parseInt(listStock.jumlah.replace(/[^0-9]/gi, '')) + parseInt(resRows.jumlah));
                            //KALO NAMA KODE SUDAH ADA
                            queryItemString = "UPDATE bengkelb_bandotcom.tb_item SET " +
                                "hargabeli = '" + hargaBeli + "', " +
                                "hargajual = '" + hargaJual + "', " +
                                "jumlah = '" + total + "' " +
                                "where kode = '" + resRows.kode + "' ";


                            queryTrxString = "INSERT INTO bengkelb_bandotcom.tb_trx (idkode, hargabeli, hargajual, tanggal, jenistrx, jumlah) VALUES " +
                                "('" + listStock.kode + "', '" + hargaBeli + "', '" + hargaJual + "', '" + dateNow + "', '1', '" + jumlah + "')";

                            logString = "Kode Barang : " + listStock.kode + "\n" +
                                "Harga Beli : " + hargaBeli + "\n" +
                                "Harga Jual : " + hargaJual + "\n" +
                                "Jumlah : " + jumlah;

                            queryLogString = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES " +
                                "('" + user + "', 'Tambah Stock','" + logString + "','" + dateNow + "')";

                            var itemPush = bandotcomConn.query(queryItemString);
                            var trxPush = bandotcomConn.query(queryTrxString);
                            var logPush = bandotcomConn.query(queryLogString);

                            Promise.all([itemPush, trxPush, logPush])
                                .then(function () {
                                    string = encodeURIComponent("1");
                                }).catch(function (error) {
                                    //logs out the error
                                    string = encodeURIComponent("2");
                                    console.error(error);
                                });
                        } else {
                            //KALO KODE BELUM ADA SAMA SEKALI
                            var findMaxIdKodePromise = new Promise(function (resolve, reject) {
                                resolve(_.maxBy(rows, 'idkode'));
                            });

                            findMaxIdKodePromise.then(function (resMaxId) {
                                var maxID = (_.isUndefined(resMaxId))? 0 : resMaxId.idkode;
                                var newIdKode = (parseInt(maxID) + num);
                                //console.log(newIdKode);
                                var queryKodeString = "INSERT INTO bengkelb_bandotcom.tb_kode (idkode, kode, nama, merek, jenis, deskripsi, catatan) VALUES " +
                                    "('" + newIdKode + "', '" + listStock.kode + "', '" + listStock.nama + "', '" + listStock.merek + "', '" + listStock.jenis + "', '" + listStock.deskripsi + "', '" + listStock.catatan + "')";
                                var queryItemString = "INSERT INTO bengkelb_bandotcom.tb_item (idkode, hargabeli, hargajual, jumlah) VALUES " +
                                    "('" + newIdKode + "', '" + hargaBeli + "', '" + hargaJual + "', '" + jumlah + "')";

                                queryTrxString = "INSERT INTO bengkelb_bandotcom.tb_trx (idkode, hargabeli, hargajual, tanggal, jenistrx, jumlah) VALUES " +
                                    "('" + newIdKode + "', '" + hargaBeli + "', '" + hargaJual + "', '" + dateNow + "', '1', '" + jumlah + "')";

                                logString = "Kode Barang : " + listStock.kode + "\n" +
                                    "Merek Barang : " + listStock.merek + "\n" +
                                    "Nama Barang : " + listStock.nama + "\n" +
                                    "Jenis Barang : " + listStock.jenis + "\n" +
                                    "Deskripsi Barang : " + listStock.deskripsi + "\n" +
                                    "Catatan Barang : " + listStock.catatan + "\n" +
                                    "Harga Beli : " + hargaBeli + "\n" +
                                    "Harga Jual : " + hargaJual + "\n" +
                                    "Jumlah : " + jumlah;

                                queryLogString = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES " +
                                    "('" + user + "', 'Tambah Stock Jenis Baru','" + logString + "','" + dateNow + "')";

                                var itemPush = bandotcomConn.query(queryItemString);
                                var kodePush = bandotcomConn.query(queryKodeString);
                                var trxPush = bandotcomConn.query(queryTrxString);
                                var logPush = bandotcomConn.query(queryLogString);

                                Promise.all([itemPush, kodePush, trxPush, logPush])
                                    .then(function () {
                                        string = encodeURIComponent("1");
                                    }).catch(function (error) {
                                        //logs out the error
                                        string = encodeURIComponent("2");
                                        console.error(error);
                                    });
                            }).catch(function (error) {
                                //logs out the error
                                string = encodeURIComponent("2");
                                console.error(error);
                            });
                        }
                        num++;
                    });
                }).then(function () {
                    res.redirect('/add-stock?respost=' + string);
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            });
    }
});

/* GET recap page. */
router.get('/recap-stock', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        bandotcomConn.query("select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode")
            .then(function (rowItem) {
                res.render('recap-stock', {
                    rows: rowItem
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET trx-in page. */
router.get('/trxin-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateMonth = moment().format("M");
        var dateYear = moment().format("YYYY");
        var queryString = "select *, (hargabeli*jumlah) total from tb_trx " +
            "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
            "where (jenistrx = '1' OR jenistrx = '3') AND " +
            "MONTH(tb_trx.tanggal) = '" + dateMonth + "' " +
            "AND YEAR(tb_trx.tanggal) = '" + dateYear + "' " +
            "order by tb_trx.tanggal";
        bandotcomConn.query(queryString)
            .then(function (rowItem) {
                res.render('trxin-report', {
                    rows: rowItem,
                    grandTotal: _.sumBy(rowItem, 'total')
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* POST trx-in page. */
router.post('/trxin-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
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
            var queryString = "select *, (hargabeli*jumlah) total from tb_trx " +
                "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
                "where jenistrx = '1' AND " +
                "tb_trx.tanggal between '" + startDate + "' " +
                "AND '" + endDate + "' " +
                "order by tb_trx.tanggal";
            bandotcomConn.query(queryString)
                .then(function (rowItem) {
                    if (!_.isEmpty(rowItem)) {
                        res.render('trxin-report', {
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
                    console.error(error);
                });
        }
    }
});

/* GET trx-out page. */
router.get('/trxout-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateMonth = moment().format("M");
        var dateYear = moment().format("YYYY");
        var queryString = "select *, (hargajual*jumlah) total from tb_trx " +
            "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
            "where jenistrx = '2' and " +
            "MONTH(tb_trx.tanggal) = '" + dateMonth + "' " +
            "AND YEAR(tb_trx.tanggal) = '" + dateYear + "' " +
            "order by tb_trx.tanggal";
        bandotcomConn.query(queryString)
            .then(function (rowItem) {
                var groupedOrderid = _.groupBy(rowItem, 'orderid');

                res.render('trxout-report', {
                    template: groupedOrderid,
                    rows: rowItem,
                    grandTotal: _.sumBy(rowItem, 'total')
                });

            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* POST trx-out page. */
router.post('/trxout-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
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
            var queryString = "select *, (hargajual*jumlah) total from tb_trx " +
                "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
                "where jenistrx = '2' and " +
                "tb_trx.tanggal between '" + startDate + "' " +
                "AND '" + endDate + "' " +
                "order by tb_trx.tanggal";
            bandotcomConn.query(queryString)
                .then(function (rowItem) {
                    var groupedOrderid = _.groupBy(rowItem, 'orderid');

                    if (!_.isEmpty(rowItem)) {
                        res.render('trxout-report', {
                            template: groupedOrderid,
                            grandTotal: _.sumBy(rowItem, 'total'),
                            filterDate: filterDate
                        });
                    } else {
                        message = {'text': "Tidak ada laporan di tanggal yang dipilih", 'color': "red"};
                        res.render('trxout-report', {
                            message: message,
                            grandTotal: 0,
                            filterDate: filterDate
                        });
                    }

                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
        }
    }
});

/* GET income page. */
router.get('/income-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateMonth = moment().format("M");
        var dateYear = moment().format("YYYY");
        var grandTotalJual = 0;
        var grandTotalBeli = 0;
        var grandTotalEdit = 0;
        var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from tb_trx " +
            "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
            "WHERE " +
            "MONTH(tb_trx.tanggal) = '" + dateMonth + "' " +
            "AND YEAR(tb_trx.tanggal) = '" + dateYear + "' " +
            "order by tb_trx.tanggal";
        //console.log(queryString);
        bandotcomConn.query(queryString)
            .then(function (rowItem) {
                //PEMBELIAN
                var promisePembelian = new Promise(function (resolve, reject) {
                    resolve(_.filter(rowItem, {'jenistrx': 1}));
                });

                promisePembelian.then(function (rowPembelian) {
                    grandTotalBeli = (_.isNumber(_.sumBy(rowPembelian, 'totalbeli'))) ? _.sumBy(rowPembelian, 'totalbeli') : 0;

                }).then(function () {
                    //PENJUALAN
                    var promisePenjualan = new Promise(function (resolve, reject) {
                        resolve(_.filter(rowItem, {'jenistrx': 2}));
                    });

                    promisePenjualan.then(function (rowPenjualan) {
                        grandTotalJual = (_.isNumber(_.sumBy(rowPenjualan, 'totaljual'))) ? _.sumBy(rowPenjualan, 'totaljual') : 0;

                    }).then(function () {
                        //EDIT STOCK
                        var promiseEditStock = new Promise(function (resolve, reject) {
                            resolve(_.filter(rowItem, {'jenistrx': 3}));
                        });

                        promiseEditStock.then(function (rowEditStock) {
                            grandTotalEdit = (_.isNumber(_.sumBy(rowEditStock, 'totalbeli'))) ? _.sumBy(rowEditStock, 'totalbeli') : 0;
                            //console.log(grandTotalEdit);

                        }).then(function () {

                            res.render('income-report', {
                                rows: rowItem,
                                grandTotalJual: grandTotalJual,
                                grandTotalBeli: (grandTotalBeli + grandTotalEdit),
                                totalLaba: (grandTotalJual - (grandTotalBeli + grandTotalEdit))
                            });

                        }).catch(function (error) {
                            //logs out the error
                            console.error(error);
                        });
                    });
                });
            });
    }
});

/* POST income page. */
router.post('/income-report', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var grandTotalJual = 0;
        var grandTotalBeli = 0;
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
            var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from tb_trx " +
                "LEFT JOIN tb_kode ON tb_trx.idkode = tb_kode.idkode " +
                "WHERE " +
                "tb_trx.tanggal between '" + startDate + "' " +
                "AND '" + endDate + "' " +
                "order by tb_trx.tanggal";
            bandotcomConn.query(queryString)
                .then(function (rowItem) {
                    //PEMBELIAN
                    var promisePembelian = new Promise(function (resolve, reject) {
                        resolve(_.filter(rowItem, {'jenistrx': 1}));
                    });

                    promisePembelian.then(function (rowPembelian) {
                        grandTotalBeli = (_.isNumber(_.sumBy(rowPembelian, 'totalbeli'))) ? _.sumBy(rowPembelian, 'totalbeli') : 0;

                    }).then(function () {
                        //PENJUALAN
                        var promisePenjualan = new Promise(function (resolve, reject) {
                            resolve(_.filter(rowItem, {'jenistrx': 2}));
                        });

                        promisePenjualan.then(function (rowPenjualan) {
                            grandTotalJual = (_.isNumber(_.sumBy(rowPenjualan, 'totalbeli'))) ? _.sumBy(rowPenjualan, 'totalbeli') : 0;

                        }).then(function () {
                            if (!_.isEmpty(rowItem)) {
                                console.log(grandTotalBeli);
                                console.log(grandTotalJual);
                                console.log(grandTotalJual - grandTotalBeli);

                                res.render('income-report', {
                                    rows: rowItem,
                                    grandTotalJual: grandTotalJual,
                                    grandTotalBeli: grandTotalBeli,
                                    totalLaba: (grandTotalJual - grandTotalBeli),
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
                            console.error(error);
                        });
                    });
                });
        }
    }
});

/* GET log page. */
router.get('/log', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateMonth = moment().format("M");
        var dateYear = moment().format("YYYY");
        bandotcomConn.query("select * from tb_log where " +
            "MONTH(tanggal) = '" + dateMonth + "' " +
            "AND YEAR(tanggal) = '" + dateYear + "' " +
            "order by tanggal DESC")
            .then(function (rowItem) {
                res.render('log', {
                    rows: rowItem
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* POST log page. */
router.post('/log', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var postDate = req.body.periode;
        if (_.isEmpty(postDate.start)) {
            res.redirect('/log');
        } else {
            var startDate = moment(new Date(postDate.start)).format("YYYY-MM-DD 00:00:00");
            var endDate = moment(new Date(postDate.end)).format("YYYY-MM-DD 23:59:59");
            var filterDate = {
                'start': moment(new Date(postDate.start)).format("DD MMMM, YYYY"),
                'end': moment(new Date(postDate.end)).format("DD MMMM, YYYY")
            };
            bandotcomConn.query("select * from tb_log where " +
                "tanggal between '" + startDate + "' " +
                "AND '" + endDate + "' " +
                "order by tanggal DESC")
                .then(function (rowItem) {
                    res.render('log', {
                        rows: rowItem,
                        filterDate: filterDate
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
        }
    }
});

/* GET edit-qty page. */
router.get('/qty-edit', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable = req.query.respost;
        var message = {"text": "", "color": ""};
        switch (passedVariable) {
            case '1':
                message = {"text": "Jumlah stock berhasil diubah..", "color": "green"};
                break;
            case '2':
                message = {"text": "Ubah jumlah stock gagal..!!", "color": "red"};
                break;
            default :
                message = {"text": "", "color": ""};
                break;
        }
        bandotcomConn.query("select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode")
            .then(function (rowItem) {
                res.render('qty-edit', {
                    rows: rowItem,
                    message: message
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET edit-qty page. */
router.get('/detail-edit', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var passedVariable = req.query.respost;
        var message = {"text": "", "color": ""};
        switch (passedVariable) {
            case '1':
                message = {"text": "Detail berhasil diubah..", "color": "green"};
                break;
            case '2':
                message = {"text": "Ubah detail gagal..!!", "color": "red"};
                break;
            default :
                message = {"text": "", "color": ""};
                break;
        }
        bandotcomConn.query("select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "order by tb_kode.kode")
            .then(function (rowItem) {
                res.render('detail-edit', {
                    rows: rowItem,
                    message: message
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* POST edit-qty page. */
//update jumlah di tb_item
//insert trx di tb_trx dengan jenistrx = 3
//jenistrx = 3 bersifat minus/negatif pada kolom harga beli
//-Math.abs(num);
router.post('/qty-edit', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        var editPost = req.body.edit;
        var postJumlah = parseInt(editPost[0].qty);
        var editId = editPost[0].id;
        var user = req.session.name;
        var jumlahForTrx = 0;
        var string = encodeURIComponent("1");
        bandotcomConn.query("select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "WHERE tb_item.iditem = '" + editId + "' " +
            "order by tb_kode.kode")
            .then(function (rowItem) {
                var currJumlah = parseInt(rowItem[0].jumlah);
                if ((postJumlah > currJumlah)) {
                    jumlahForTrx = (postJumlah - currJumlah);
                } else if ((postJumlah < currJumlah)) {
                    jumlahForTrx = -Math.abs(currJumlah - postJumlah);
                }
                var updateItem = "UPDATE tb_item SET jumlah =  '" + postJumlah + "' where iditem = '" + editId + "'";
                var logString = "Kode Barang : " + rowItem[0].kode + "\n" +
                    "Merek Barang : " + rowItem[0].merek + "\n" +
                    "Nama Barang : " + rowItem[0].nama + "\n" +
                    "Jenis Barang : " + rowItem[0].jenis + "\n" +
                    "Deskripsi Barang : " + rowItem[0].deskripsi + "\n" +
                    "Catatan Barang : " + rowItem[0].catatan + "\n" +
                    "Harga Beli : " + rowItem[0].hargabeli + "\n" +
                    "Harga Jual : " + rowItem[0].hargajual + "\n" +
                    "Jumlah Baru : " + postJumlah;
                var insertLog = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES " +
                    "('" + user + "', 'Edit Jumlah Stock','" + logString + "','" + dateNow + "')";
                var insertTrx = "INSERT INTO bengkelb_bandotcom.tb_trx (idkode, hargabeli, hargajual, tanggal, jenistrx, jumlah) VALUES " +
                    "('" + rowItem[0].idkode + "', '" + rowItem[0].hargabeli + "', '" + rowItem[0].hargajual + "', '" + dateNow + "', '3', '" + jumlahForTrx + "')";

                var itemPush = bandotcomConn.query(updateItem);
                var trxPush = bandotcomConn.query(insertTrx);
                var logPush = bandotcomConn.query(insertLog);

                Promise.all([itemPush, trxPush, logPush])
                    .then(function () {
                        string = encodeURIComponent("1");
                        res.redirect('/qty-edit?respost=' + string);
                    }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                        string = encodeURIComponent("2");
                        res.redirect('/qty-edit?respost=' + string);
                    });
            });
    }
});

/* POST edit-price page. */
//update harga di tb_item
router.post('/detail-edit', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
        var editPost = req.body.edit;
        var postHargaJual = parseInt(editPost[0].hargajual.replace(/[^0-9]/gi, ''));
        var postHargaBeli = parseInt(editPost[0].hargabeli.replace(/[^0-9]/gi, ''));
        var user = req.session.name;
        var string = encodeURIComponent("1");

        bandotcomConn.query("select * from tb_kode " +
            "LEFT JOIN tb_item ON tb_kode.idkode = tb_item.idkode " +
            "WHERE tb_item.iditem = '" + editPost[0].id + "' " +
            "order by tb_kode.kode")
            .then(function (rowItem) {
                var updateKode = "UPDATE tb_kode SET " +
                    "kode =  '" + editPost[0].kode + "', " +
                    "merek =  '" + editPost[0].merek + "', " +
                    "nama =  '" + editPost[0].nama + "', " +
                    "jenis =  '" + editPost[0].jenis + "', " +
                    "deskripsi =  '" + editPost[0].deskripsi + "', " +
                    "catatan =  '" + editPost[0].catatan + "' " +
                    "WHERE idkode = '" + rowItem[0].idkode + "'";

                var updateItem = "UPDATE tb_item SET " +
                    "hargabeli =  '" + postHargaBeli + "', " +
                    "hargajual =  '" + postHargaJual + "' " +
                    "WHERE iditem = '" + editPost[0].id + "'";
                //console.log(updateKode);
                var logString = "Kode Barang : " + editPost[0].kode + "\n" +
                    "Merek Barang : " + editPost[0].merek + "\n" +
                    "Nama Barang : " + editPost[0].nama + "\n" +
                    "Jenis Barang : " + editPost[0].jenis + "\n" +
                    "Deskripsi Barang : " + editPost[0].deskripsi + "\n" +
                    "Catatan Barang : " + editPost[0].catatan + "\n" +
                    "Harga Beli : " + editPost[0].hargabeli + "\n" +
                    "Harga Jual : " + editPost[0].hargajual;
                var insertLog = "INSERT INTO bengkelb_bandotcom.tb_log (user, aksi, detail, tanggal) VALUES " +
                    "('" + user + "', 'Edit Jumlah Stock','" + logString + "','" + dateNow + "')";

                var kodePush = bandotcomConn.query(updateKode);
                var itemPush = bandotcomConn.query(updateItem);
                var logPush = bandotcomConn.query(insertLog);

                Promise.all([itemPush, kodePush, logPush])
                    .then(function () {
                        string = encodeURIComponent("1");
                        res.redirect('/detail-edit?respost=' + string);
                    }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                        string = encodeURIComponent("2");
                        res.redirect('/detail-edit?respost=' + string);
                    });
            });
    }
});

/* GET logout page. */
router.get('/logout', function(req, res) {
    if(_.isUndefined(req.session.login) || req.session.login != 'loged'){
        res.redirect('/login-auth');
    }else {
        req.session.destroy(function(err) {
            res.redirect('/login-auth');
        })
    }
});

module.exports = router;
