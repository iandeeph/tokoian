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

/* GET home page. */
router.get('/', function(req, res) {
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
        .then(function (row) {
            var groupedOrderid = _.groupBy(row, 'soid');
            var bulanTahun = {"bulantahun": moment(Date.now()).format("MMMM YYYY")};
            res.render('index', {
                rows: groupedOrderid,
                bulanTahun : bulanTahun
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* GET AJAX home page CHART. */
router.get('/get-top-chart', function(req, res) {
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
        "MONTH(tanggal) = '" + dateMonth + "' " +
        "AND YEAR(tanggal) = '" + dateYear + "' " +
        "group by idkode order by jumlah desc limit 5 ) trx " +
        "left join kode on trx.idkode = kode.idkode " +
        "";
    tokoianConn.query(queryString)
        .then(function (rowItem) {
            return Promise.each(rowItem, function (item) {
                labels.push(item.kode + " ("+ item.nama +")");
                data.push(item.jumlah);
            }).then(function () {
                Promise.all(labels, data)
                    .then(function () {
                        // console.log(labels);
                        template = {"labels": labels, "data": data};
                        res.json(template);
                    });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* GET code-list page. */
router.get('/code-list', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    return tokoianConn.query("select kode.idkode idkode, kode.nama nama, kode.kode kode, kode.status status, item.jumlah jumlah from kode left join item on kode.idkode = item.idkode order by kode.kode")
        .then(function (listCode) {
            switch (passedVariable) {
                case '1':
                    message = {"text": "Kode produk berhasil ditambah..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Tambah kode produk gagal..!! "+ req.query.error, "color": "red"};
                    break;
                case '3':
                    message = {"text": "Edit detail kode berhasil..", "color": "green"};
                    break;
                case '4':
                    message = {"text": "Edit detail kode gagal..!! "+ req.query.error, "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
            res.render('code', {
                listCode : listCode,
                priv : req.session.priv,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* POST add-code page. */
router.post('/code-list', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    var arrayKodeQuery = [];
    var arrayItemQuery = [];
    var arrayLogQuery = [];
    var num = 1;
    let maxid = "";
    if (!_.isUndefined(req.body.addCodeSubmit)){
        var lists = Array.prototype.slice.call(req.body.listKode);

        return tokoianConn.query("select max(idkode) maxid from kode")
            .then(function (maxId) {
                // console.log(maxId);
                return Promise.each(lists, function (listStock) {
                    var maxIdCode = (parseInt(maxId[0].maxid || 0) + num);
                    // console.log(maxIdCode);
                    arrayKodeQuery.push([listStock.kode, listStock.nama]);
                    arrayItemQuery.push([maxIdCode]);

                    var logString = "ID Kode : " + maxIdCode + "\n" +
                        "Kode Barang : " + listStock.kode + "\n" +
                        "Nama Barang : " + listStock.nama + "\n";

                    arrayLogQuery.push([user, "Tambah Kode Produk", logString, dateNow]);
                    num++;
                }).then(function () {
                    var queryKodeString = "INSERT INTO kode (kode, nama) VALUES?";
                    var queryItemString = "INSERT INTO item (idkode) VALUES?";
                    var queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";

                    var pushKode = tokoianConn.query(queryKodeString, [arrayKodeQuery]);
                    var pushItem = tokoianConn.query(queryItemString, [arrayItemQuery]);
                    var pushLog = tokoianConn.query(queryLogString, [arrayLogQuery]);

                    Promise.all([pushKode, pushItem, pushLog])
                        .then(function (results) {
                            // console.log(results);
                            var string = encodeURIComponent("1");
                            res.redirect('/code-list?respost=' + string);
                        }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                        var string = encodeURIComponent("2");
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/code-list?respost=' + string +'&error='+error);
                    });
                });
            });
    }else if (!_.isUndefined(req.body.editCodeSubmit)){
        var updateKode = "UPDATE kode SET nama =  '" + req.body.editKode.nama + "', kode =  '" + req.body.editKode.kode + "' where idkode = '" + decrypt(req.body.editCodeSubmit) + "'";

        var logString = "Kode Barang : " + req.body.editKode.kodeOld + "\n" +
            "Nama Barang : " + req.body.editKode.namaOld + "\n" +
            "Updated to :\n " +
            "Kode Barang : " + req.body.editKode.kode + "\n" +
            "Nama Barang : " + req.body.editKode.nama;
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Edit Detail Kode','" + logString + "','" + dateNow + "')";
        var kodePush = tokoianConn.query(updateKode);
        var logPush = tokoianConn.query(insertLog);
        Promise.all([kodePush, logPush])
            .then(function () {
                var string = encodeURIComponent("3");
                res.redirect('/code-list?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            console.error(error);
            var string = encodeURIComponent("4");
            var errorStr = encodeURIComponent(error);
            res.redirect('/code-list?respost=' + string +'&error='+error);
        });
    }
});

/* GET AJAX code-list page. */
router.get('/status-code', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var idkode = decrypt(req.query.kode) || {};
    var updateStatus = "UPDATE kode SET status =  '" + passedVariable + "' where idkode = '" + idkode + "'";
    // console.log(updateStatus);
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
        "where kode.idkode = '" + idkode + "'").then(function (listKode) {

        if (listKode[0].jumlah > 0 ){
            res.send("Not Empty");
        } else {
            var logString = "Kode Barang : " + listKode[0].kode + "\n" +
                "Nama Barang : " + listKode[0].nama + "\n" +
                "Status to : " + passedVariable + "\n";
            var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                "('" + user + "', 'Edit Status','" + logString + "','" + dateNow + "')";
            var kodePush = tokoianConn.query(updateStatus);
            var logPush = tokoianConn.query(insertLog);
            Promise.all([kodePush, logPush])
                .then(function () {
                    res.send("ok");
                }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
        }
    }).catch(function (error) {
        //logs out the error
        console.error(error);
    });
});

/* GET order-in page. */
router.get('/order-in', function(req, res) {
    var passedVariable = req.query.respost || {};
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    return tokoianConn.query("select orderid from trx where jenistrx = '1' order by tanggal desc limit 1")
        .then(function (row) {
            return tokoianConn.query("select * from kode order by kode")
                .then(function (kodeRow){
            let getOrderId = (!_.isEmpty(row))?row[0].orderid : "00000";
            let maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
            var orderid = "#IN-" + randomize('?Aa0',3,dateNow).concat(moment(Date.now()).format("YY"),("00000" + (maxOrderId+1)).slice(-5));
            var message = {"text": "", "color": ""};
                switch (passedVariable) {
                    case '1':
                        message = {"text": "Item berhasil ditambah..", "color": "green"};
                        break;
                    case '2':
                        message = {"text": "Item gagal ditamnbah..!! "+ req.query.error, "color": "red"};
                        break;
                    default :
                        message = {"text": "", "color": ""};
                        break;
                }
                res.render('order-in', {
                    orderid : orderid,
                    kodeRow : kodeRow,
                    message: message
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* POST order-in page. */
router.post('/order-in', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postOrder = req.body.inOrder || {};
    let queryItemString = "";
    let queryTrxString = "";
    let queryLogString = "";
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
        return tokoianConn.query(queryStr).then(function (rows) {
            // console.log(queryStr);
            var lists = Array.prototype.slice.call(postOrder);
            return Promise.each(lists, function (listStock) {
                var hargaBeli = parseInt(listStock.hargabeli.replace(/[^0-9]/gi, ''));
                var jumlah = parseInt(listStock.jumlah.replace(/[^0-9]/gi, ''));
                var total;

                var cekNamakodePromise = new Promise(function (resolve, reject) {
                    resolve(_.find(rows, {'kode': listStock.kode}));
                });

                cekNamakodePromise.then(function (resRows) {
                    // console.log(resRows);
                    if (!_.isEmpty(resRows) || !_.isUndefined(resRows)) {
                        total = (parseInt(listStock.jumlah.replace(/[^0-9]/gi, '')) + parseInt(resRows.jumlah));

                        queryItemString = "UPDATE item SET " +
                            "hargabeli = '" + hargaBeli + "', " +
                            "jumlah = '" + total + "' " +
                            "where idkode = '" + resRows.idkode + "' ";


                        queryTrxString = "INSERT INTO trx (idkode, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES " +
                            "('" + resRows.idkode + "','" + listStock.orderid + "', '" + hargaBeli + "', '" + dateNow + "', '1', '" + jumlah + "')";

                        let logString = "Order ID : " + listStock.orderid + "\n" +
                            "Kode Barang : " + listStock.kode + "\n" +
                            "Nama Barang : " + listStock.nama + "\n" +
                            "Harga Beli : " + hargaBeli + "\n" +
                            "Jumlah : " + jumlah;

                        queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                            "('" + user + "', 'Barang Masuk','" + logString + "','" + dateNow + "')";

                        var itemPush = tokoianConn.query(queryItemString);
                        var trxPush = tokoianConn.query(queryTrxString);
                        var logPush = tokoianConn.query(queryLogString);

                        Promise.all([itemPush, trxPush, logPush])
                            .then(function () {
                                let string = encodeURIComponent("1");
                                res.redirect('/order-in?respost=' + string);
                            }).catch(function (error) {
                            //logs out the error
                            let string = encodeURIComponent("2");
                            console.error(error);
                            var errorStr = encodeURIComponent(error);
                            res.redirect('/order-in?respost=' + string +'&error='+error);
                        });
                    }
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            });

        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }
});

/* GET AJAX get item page. */
router.get('/get-item', function(req, res) {
    // console.log(req.query.id);
    if (!_.isUndefined(req.query.id)){
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
            "idcustomer = '"+ req.query.cust +"') pricelist " +
            "on " +
            "kode.idkode = pricelist.idkode " +
            "where kode.status = '1' AND kode.kode = '"+ req.query.id +"' " +
            "order by kode.nama";
        return tokoianConn.query(qryString)
            .then(function (listKode) {
                // console.log(qryString);
                // console.log(listKode);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    } else {
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
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
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
                console.error(error);
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
        console.error(error);
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
            console.error(error);
        });
    }
});

/* GET list customer page. */
router.get('/customer-list', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    return tokoianConn.query("select * from customer")
        .then(function (listCust) {
            switch (passedVariable) {
                case '1':
                    message = {"text": "Toko berhasil ditambah..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Tambah toko gagal..!! "+ req.query.error, "color": "red"};
                    break;
                case '3':
                    message = {"text": "Edit detail toko berhasil..", "color": "green"};
                    break;
                case '4':
                    message = {"text": "Edit detail toko gagal..!! "+ req.query.error, "color": "red"};
                    break;
                case '5':
                    message = {"text": "Customer belum memiliki SO..! ", "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
            res.render('recap-customer', {
                listCode : listCust,
                priv : req.session.priv,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
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
            // console.log(req.body);
            arrayCustomerQuery.push([postCust.nama, postCust.pic, postCust.telp, postCust.alamat]);

            logString = "Nama Toko : " + postCust.nama + "\n" +
                "PIC : " + postCust.pic + "\n" +
                "No Telp : " + postCust.telp + "\n" +
                "Alamat : " + postCust.alamat + "\n";

            arrayLogQuery.push([user, "Tambah Customer Baru", logString, dateNow]);
            // console.log(arrayCustomerQuery);
            var queryCustomerString = "INSERT INTO customer (nama, pic, telp, alamat) VALUES?";
            var queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";

            pushCust = tokoianConn.query(queryCustomerString, [arrayCustomerQuery]);
            pushLog = tokoianConn.query(queryLogString, [arrayLogQuery]);

            Promise.all([pushCust, pushLog])
                .then(function (results) {
                    // console.log(results);
                    var string = encodeURIComponent("1");
                    res.redirect('/customer-list?respost=' + string);
                }).catch(function (error) {
                //logs out the error
                console.error(error);
                var string = encodeURIComponent("2");
                var errorStr = encodeURIComponent(error);
                res.redirect('/customer-list?respost=' + string +'&error='+error);
            });
    }else if (!_.isUndefined(req.body.editTokoSubmit)){
        var updateCust = "UPDATE customer SET nama =  '" + req.body.editToko.nama + "', pic =  '" + req.body.editToko.pic + "', telp =  '" + req.body.editToko.telp + "', alamat =  '" + req.body.editToko.alamat + "' where idcustomer = '" + decrypt(req.body.editTokoSubmit) + "'";

        logString = "Nama Toko : " + req.body.editToko.namaOld + "\n" +
            "PIC : " + req.body.editToko.picOld + "\n" +
            "No Telp : " + req.body.editToko.telpOld + "\n" +
            "Alamat : " + req.body.editToko.alamatOld + "\n" +
            "Updated to :\n " +
            "Nama Toko : " + req.body.editToko.nama + "\n" +
            "PIC : " + req.body.editToko.pic + "\n" +
            "No Telp : " + req.body.editToko.telp + "\n" +
            "Alamat : " + req.body.editToko.alamat;
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Edit Detail Customer','" + logString + "','" + dateNow + "')";
        pushCust = tokoianConn.query(updateCust);
        pushLog = tokoianConn.query(insertLog);
        Promise.all([pushCust, pushLog])
            .then(function () {
                var string = encodeURIComponent("3");
                res.redirect('/customer-list?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            console.error(error);
            var string = encodeURIComponent("4");
            var errorStr = encodeURIComponent(error);
            res.redirect('/customer-list?respost=' + string +'&error='+error);
        });
    }
});

/* GET AJAX code-list page. */
router.get('/cust-status-code', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var id = decrypt(req.query.kode) || {};
    var updateStatus = "UPDATE customer SET status =  '" + passedVariable + "' where idcustomer = '" + id + "'";
    // console.log(updateStatus);
    return tokoianConn.query("select * " +
        "from " +
        "customer " +
        "where idcustomer = '" + id + "'").then(function (list) {
            // console.log(list[0].nama);
        var logString = "Nama Custmoer : " + list[0].nama + "\n" +
            "Status to : " + passedVariable + "\n";
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Edit Status Customer','" + logString + "','" + dateNow + "')";
        var custPush = tokoianConn.query(updateStatus);
        var logPush = tokoianConn.query(insertLog);
        Promise.all([custPush, logPush])
            .then(function () {
                res.send("ok");
            }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }).catch(function (error) {
        //logs out the error
        console.error(error);
    });
});

/* GET add sales order page. */
router.get('/add-sales-order', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    return tokoianConn.query("select soid from salesorder order by tanggal desc limit 1")
        .then(function (row) {
            return tokoianConn.query("select * from kode order by kode")
                .then(function (kodeRow) {
                return tokoianConn.query("select * from customer order by nama")
                    .then(function (custRow) {
                        let getOrderId = (!_.isEmpty(row))?row[0].soid : "00000";
                        let maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
                        var orderid = "#OUT-" + randomize('?Aa0', 3, dateNow).concat(moment(Date.now()).format("YY"), ("00000" + (maxOrderId + 1)).slice(-5));

                        switch (passedVariable) {
                            case '1':
                                message = {"text": "Sales Order berhasil dibuat..", "color": "green"};
                                break;
                            case '2':
                                message = {"text": "Sales Order gagal dibuat..!! "+ req.query.error, "color": "red"};
                                break;
                            default :
                                message = {"text": "", "color": ""};
                                break;
                        }
                        res.render('add-so', {
                            orderid : orderid,
                            kodeRow : kodeRow,
                            custRow : custRow,
                            message: message
                        });
                    }).catch(function (error) {
                        //logs out the error
                        console.error(error);
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
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
    let checkerArray = [];
    let querySoString = "";
    let queryLogString = "";
    let trxPush = [];
    let logPush = [];
    if (!_.isUndefined(req.body.addSoSubmit)){
        return Promise.each(postOrder, function (listSo) {
            console.log(listSo);
            var hargaJual = parseInt(listSo.hargajual.replace(/[^0-9]/gi, ''));
            var jumlah = parseInt(listSo.jumlah.replace(/[^0-9]/gi, ''));

            let logString = "Sales Order ID : " + orderid + "\n" +
                "Nama Customer : " + customer.nama + "\n" +
                "Kode Barang : " + listSo.kode + "\n" +
                "Nama Barang : " + listSo.nama + "\n" +
                "Harga Jual : " + hargaJual + "\n" +
                "Jumlah : " + jumlah;

            querySoArray.push([orderid, customer.idcustomer, listSo.idkode, hargaJual, dateNow, jumlah]);
            querylogArray.push([user, 'Input Sales Order', logString, dateNow]);
        }).then(function () {
            querySoString = "INSERT INTO salesorder (soid, idcustomer, idkode, hargajual, tanggal, jumlah) VALUES?";
            queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES?";

            trxPush.push(tokoianConn.query(querySoString, [querySoArray]));
            logPush.push(tokoianConn.query(queryLogString, [querylogArray]));
            Promise.all([trxPush, logPush])
                .then(function () {
                    let string = encodeURIComponent("1");
                    res.redirect('/add-sales-order?respost=' + string);
                }).catch(function (error) {
                    //logs out the error
                    let string = encodeURIComponent("2");
                    console.error(error);
                    var errorStr = encodeURIComponent(error);
                    res.redirect('/add-sales-order?respost=' + string +'&error='+errorStr);
                });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
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
            "where nama = '"+ req.query.id +"' and status = '1'" +
            "order by nama";
        return tokoianConn.query(qryString)
            .then(function (listKode) {
                // console.log(qryString);
                res.json(listKode);
            }).catch(function (error) {
                //logs out the error
                console.error(error);
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
                console.error(error);
            });
    }
});

/* GET recap sales order page. */
router.get('/recap-sales-order', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
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
            switch (passedVariable) {
                case '1':
                    message = {"text": "Sales Order berhasil dihapus..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Sales Order gagal dihapus..!! "+ req.query.error, "color": "red"};
                    break;
                case '3':
                    message = {"text": "Sales Order berhasil diproses..", "color": "green"};
                    break;
                case '4':
                    message = {"text": "Sales Order gagal diproses..!! "+ req.query.error, "color": "red"};
                    break;
                case '5':
                    message = {"text": "Reopen Sales Order berhasil..", "color": "green"};
                    break;
                case '6':
                    message = {"text": "Reopen Sales Order gagal..!! "+ req.query.error, "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
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
                grandTotal: grandTotal,
                message: message

            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* POST recap sales order. */
router.post('/recap-sales-order', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let querySoString = "";
    let queryLogString = "";
    let queryItemString = "";
    let queryTrxString = "";
    var trxPush = "";
    var logPush = "";
    if (!_.isUndefined(req.body.hapusSoBtn)) { //DELETE SO
        querySoString = "UPDATE salesorder SET status='Dihapus' WHERE soid = '"+ req.body.deletedSoid +"'";
        let logString = "Sales Order ID : " + req.body.deletedSoid;

        queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Sales Order Dihapus','" + logString + "','" + dateNow + "')";

        trxPush = tokoianConn.query(querySoString);
        logPush = tokoianConn.query(queryLogString);

        Promise.all([trxPush, logPush])
            .then(function () {
                let string = encodeURIComponent("1");
                res.redirect('/recap-sales-order?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            let string = encodeURIComponent("2");
            console.error(error);
            var errorStr = encodeURIComponent(error);
            res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
        });
    }else if (!_.isUndefined(req.body.prosesSoSubmit)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);
                var cekStock = new Promise(function (resolve, reject) {
                    resolve(_.find(row, function (r) {
                        return r.sisastock < 0;
                    }))
                });

                cekStock.then(function (stock) {
                    if (!_.isEmpty(stock) || !_.isUndefined(stock)) {
                        let string = encodeURIComponent("4");
                        var errorStr = "Jumlah stock item id "+ stock.idkode +" ("+ stock.namaitem +") tidak mencukupi";
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+errorStr);
                    }else{
                        return Promise.each(row, function (itemRow) {
                            // console.log(typeof itemRow.jumlah);
                            var jumlah = parseInt(itemRow.jumlah);
                            var stock = parseInt(itemRow.stock);
                            var hargaJual = parseInt(itemRow.hargajual);
                            var sisaStock;

                            sisaStock = (stock - jumlah);
                            console.log(sisaStock);
                            queryItemString = "UPDATE item SET " +
                                "jumlah = '" + sisaStock + "' " +
                                "where idkode = '" + itemRow.idkode + "' ";

                            querySoString = "UPDATE salesorder SET " +
                                "status = 'Done' " +
                                "where soid = '" + itemRow.soid + "' ";

                            queryTrxString = "INSERT INTO trx (idkode, orderid, hargajual, tanggal, jenistrx, jumlah) VALUES " +
                                "('" + itemRow.idkode + "','" + itemRow.soid + "', '" + hargaJual + "', '" + dateNow + "', '2', '" + jumlah + "')";

                            let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                                "Nama Toko : " + itemRow.customer + "\n" +
                                "Alamat Toko : " + itemRow.alamat;

                            queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                                "('" + user + "', 'Proses SO to DO','" + logString + "','" + dateNow + "')";

                            var itemPush = tokoianConn.query(queryItemString);
                            var soPush = tokoianConn.query(querySoString);
                            var trxPush = tokoianConn.query(queryTrxString);
                            var logPush = tokoianConn.query(queryLogString);

                            Promise.all([itemPush, soPush, trxPush, logPush])
                                .then(function () {
                                    let string = encodeURIComponent("3");
                                    res.redirect('/recap-sales-order?respost=' + string);
                                }).catch(function (error) {
                                //logs out the error
                                let string = encodeURIComponent("4");
                                console.error(error);
                                var errorStr = encodeURIComponent(error);
                                res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                            });
                        }).catch(function (error) {
                            //logs out the error
                            console.error(error);
                        });
                    }
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else if (!_.isUndefined(req.body.reopenSoBtn)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);
                var cekStock = new Promise(function (resolve, reject) {
                    resolve(_.find(row, function (r) {
                        return r.sisastock < 0;
                    }))
                });
                return Promise.each(row, function (itemRow) {
                    // console.log(typeof itemRow.jumlah);
                    var jumlah = parseInt(itemRow.jumlah);
                    var stock = parseInt(itemRow.stock);
                    var hargaBeli = parseInt(itemRow.hargabeli);
                    var sisaStock;

                    sisaStock = (stock + jumlah);
                    // console.log(sisaStock);
                    queryItemString = "UPDATE item SET " +
                        "jumlah = '" + sisaStock + "' " +
                        "where idkode = '" + itemRow.idkode + "' ";

                    querySoString = "UPDATE salesorder SET " +
                        "status = 'Open' " +
                        "where soid = '" + itemRow.soid + "' ";

                    queryTrxString = "INSERT INTO trx (idkode, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES " +
                        "('" + itemRow.idkode + "','" + itemRow.soid + "', '" + hargaBeli + "', '" + dateNow + "', '3', '" + jumlah + "')";

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.customer + "\n" +
                        "Alamat Toko : " + itemRow.alamat;

                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + user + "', 'Reopen PO','" + logString + "','" + dateNow + "')";

                    var itemPush = tokoianConn.query(queryItemString);
                    var soPush = tokoianConn.query(querySoString);
                    var trxPush = tokoianConn.query(queryTrxString);
                    var logPush = tokoianConn.query(queryLogString);

                    Promise.all([itemPush, soPush, trxPush, logPush])
                        .then(function () {
                            let string = encodeURIComponent("5");
                            res.redirect('/recap-sales-order?respost=' + string);
                        }).catch(function (error) {
                        //logs out the error
                        let string = encodeURIComponent("6");
                        console.error(error);
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else if (!_.isUndefined(req.body.printSoBtn)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);

                return Promise.each(row, function (itemRow) {
                    querySoString = "UPDATE salesorder SET " +
                        "printed = '1', " +
                        "userprinted = '"+ user +"', " +
                        "dateprinted = '"+ dateNow +"' " +
                        "where soid = '" + itemRow.soid + "' ";

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.kode + "\n" +
                        "Alamat Toko : " + itemRow.nama;

                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + user + "', 'Print DO','" + logString + "','" + dateNow + "')";

                    var soPush = tokoianConn.query(querySoString);
                    logPush = tokoianConn.query(queryLogString);

                    Promise.all([soPush, logPush])
                        .then(function () {
                            let string = encrypt(itemRow.soid);
                            res.redirect('/print-do?so=' + string);
                        }).catch(function (error) {
                        //logs out the error
                        let string = encodeURIComponent("4");
                        console.error(error);
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET customer SO. */
router.get('/so-customer-list', function(req, res) {
    var passedVariable = req.query.respost || {};
    var idcustomer = req.query.so || {};
    var message = {"text": "", "color": ""};
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
                    switch (passedVariable) {
                        case '1':
                            message = {"text": "Sales Order berhasil dihapus..", "color": "green"};
                            break;
                        case '2':
                            message = {"text": "Sales Order gagal dihapus..!! "+ req.query.error, "color": "red"};
                            break;
                        case '3':
                            message = {"text": "Sales Order berhasil diproses..", "color": "green"};
                            break;
                        case '4':
                            message = {"text": "Sales Order gagal diproses..!! "+ req.query.error, "color": "red"};
                            break;
                        default :
                            message = {"text": "", "color": ""};
                            break;
                    }
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
                    let string = encodeURIComponent("5");
                    res.redirect('/customer-list?respost=' + string);
                }
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else{
        res.redirect('/customer-list');
    }
});/* POST customer so. */
router.post('/so-customer-list', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let querySoString = "";
    let queryLogString = "";
    let queryItemString = "";
    let queryTrxString = "";
    if (!_.isUndefined(req.body.hapusSoBtn)) { //DELETE SO
        querySoString = "UPDATE salesorder SET status='Dihapus' WHERE soid = '"+ req.body.deletedSoid +"'";
        let logString = "Sales Order ID : " + req.body.deletedSoid;

        queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Sales Order Dihapus','" + logString + "','" + dateNow + "')";

        trxPush = tokoianConn.query(querySoString);
        logPush = tokoianConn.query(queryLogString);

        Promise.all([trxPush, logPush])
            .then(function () {
                let string = encodeURIComponent("1");
                res.redirect('/recap-sales-order?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            let string = encodeURIComponent("2");
            console.error(error);
            var errorStr = encodeURIComponent(error);
            res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
        });
    }else if (!_.isUndefined(req.body.prosesSoSubmit)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);
                var cekStock = new Promise(function (resolve, reject) {
                    resolve(_.find(row, function (r) {
                        return r.sisastock < 0;
                    }))
                });

                cekStock.then(function (stock) {
                    if (!_.isEmpty(stock) || !_.isUndefined(stock)) {
                        let string = encodeURIComponent("4");
                        var errorStr = "Jumlah stock item id "+ stock.idkode +" ("+ stock.namaitem +") tidak mencukupi";
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+errorStr);
                    }else{
                        return Promise.each(row, function (itemRow) {
                            // console.log(typeof itemRow.jumlah);
                            var jumlah = parseInt(itemRow.jumlah);
                            var stock = parseInt(itemRow.stock);
                            var hargaJual = parseInt(itemRow.hargajual);
                            var sisaStock;

                            sisaStock = (stock - jumlah);
                            console.log(sisaStock);
                            queryItemString = "UPDATE item SET " +
                                "jumlah = '" + sisaStock + "' " +
                                "where idkode = '" + itemRow.idkode + "' ";

                            querySoString = "UPDATE salesorder SET " +
                                "status = 'Done' " +
                                "where soid = '" + itemRow.soid + "' ";

                            queryTrxString = "INSERT INTO trx (idkode, orderid, hargajual, tanggal, jenistrx, jumlah) VALUES " +
                                "('" + itemRow.idkode + "','" + itemRow.soid + "', '" + hargaJual + "', '" + dateNow + "', '2', '" + jumlah + "')";

                            let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                                "Nama Toko : " + itemRow.customer + "\n" +
                                "Alamat Toko : " + itemRow.alamat;

                            queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                                "('" + user + "', 'Proses SO to DO','" + logString + "','" + dateNow + "')";

                            var itemPush = tokoianConn.query(queryItemString);
                            var soPush = tokoianConn.query(querySoString);
                            var trxPush = tokoianConn.query(queryTrxString);
                            var logPush = tokoianConn.query(queryLogString);

                            Promise.all([itemPush, soPush, trxPush, logPush])
                                .then(function () {
                                    let string = encodeURIComponent("3");
                                    res.redirect('/recap-sales-order?respost=' + string);
                                }).catch(function (error) {
                                //logs out the error
                                let string = encodeURIComponent("4");
                                console.error(error);
                                var errorStr = encodeURIComponent(error);
                                res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                            });
                        }).catch(function (error) {
                            //logs out the error
                            console.error(error);
                        });
                    }
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else if (!_.isUndefined(req.body.reopenSoBtn)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);
                var cekStock = new Promise(function (resolve, reject) {
                    resolve(_.find(row, function (r) {
                        return r.sisastock < 0;
                    }))
                });
                return Promise.each(row, function (itemRow) {
                    // console.log(typeof itemRow.jumlah);
                    var jumlah = parseInt(itemRow.jumlah);
                    var stock = parseInt(itemRow.stock);
                    var hargaBeli = parseInt(itemRow.hargabeli);
                    var sisaStock;

                    sisaStock = (stock + jumlah);
                    // console.log(sisaStock);
                    queryItemString = "UPDATE item SET " +
                        "jumlah = '" + sisaStock + "' " +
                        "where idkode = '" + itemRow.idkode + "' ";

                    querySoString = "UPDATE salesorder SET " +
                        "status = 'Open' " +
                        "where soid = '" + itemRow.soid + "' ";

                    queryTrxString = "INSERT INTO trx (idkode, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES " +
                        "('" + itemRow.idkode + "','" + itemRow.soid + "', '" + hargaBeli + "', '" + dateNow + "', '3', '" + jumlah + "')";

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.customer + "\n" +
                        "Alamat Toko : " + itemRow.alamat;

                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + user + "', 'Reopen PO','" + logString + "','" + dateNow + "')";

                    var itemPush = tokoianConn.query(queryItemString);
                    var soPush = tokoianConn.query(querySoString);
                    var trxPush = tokoianConn.query(queryTrxString);
                    var logPush = tokoianConn.query(queryLogString);

                    Promise.all([itemPush, soPush, trxPush, logPush])
                        .then(function () {
                            let string = encodeURIComponent("5");
                            res.redirect('/recap-sales-order?respost=' + string);
                        }).catch(function (error) {
                        //logs out the error
                        let string = encodeURIComponent("6");
                        console.error(error);
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else if (!_.isUndefined(req.body.printSoBtn)) {
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
            "item.jumlah stock, " +
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
            "where so.soid = '"+ req.body.prosesSoid +"'")
            .then(function (row) {
                // console.log(row);

                return Promise.each(row, function (itemRow) {
                    querySoString = "UPDATE salesorder SET " +
                        "printed = '1', " +
                        "userprinted = '"+ user +"', " +
                        "dateprinted = '"+ dateNow +"' " +
                        "where soid = '" + itemRow.soid + "' ";

                    let logString = "Sales Order ID : " + itemRow.soid + "\n" +
                        "Nama Toko : " + itemRow.kode + "\n" +
                        "Alamat Toko : " + itemRow.nama;

                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + user + "', 'Print DO','" + logString + "','" + dateNow + "')";

                    var soPush = tokoianConn.query(querySoString);
                    logPush = tokoianConn.query(queryLogString);

                    Promise.all([soPush, logPush])
                        .then(function () {
                            let string = encrypt(itemRow.soid);
                            res.redirect('/print-do?so=' + string);
                        }).catch(function (error) {
                        //logs out the error
                        let string = encodeURIComponent("4");
                        console.error(error);
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/recap-sales-order?respost=' + string +'&error='+error);
                    });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
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
        console.error(error);
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
            console.error(error);
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
    var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from trx " +
        "LEFT JOIN kode ON trx.idkode = kode.idkode " +
        "WHERE " +
        "MONTH(trx.tanggal) = '" + dateMonth + "' " +
        "AND YEAR(trx.tanggal) = '" + dateYear + "' " +
        "order by trx.tanggal";
    //console.log(queryString);
    tokoianConn.query(queryString)
        .then(function (rowItem) {
            var groupedOrderid = _.groupBy(rowItem, 'orderid');
            //PEMBELIAN = minus
            var promisePembelian = new Promise(function (resolve, reject) {
                resolve(_.filter(rowItem, {'jenistrx': 1}));
            });

            promisePembelian.then(function (rowPembelian) {
                grandTotalBeli = (_.isNumber(_.sumBy(rowPembelian, 'totalbeli'))) ? _.sumBy(rowPembelian, 'totalbeli') : 0;

            }).then(function () {
                //PENJUALAN = plus
                var promisePenjualan = new Promise(function (resolve, reject) {
                    resolve(_.filter(rowItem, {'jenistrx': 2}));
                });

                promisePenjualan.then(function (rowPenjualan) {
                    grandTotalJual = (_.isNumber(_.sumBy(rowPenjualan, 'totaljual'))) ? _.sumBy(rowPenjualan, 'totaljual') : 0;

                }).then(function () {
                    //REOPEN SO = minus
                    var promiseEditStock = new Promise(function (resolve, reject) {
                        resolve(_.filter(rowItem, {'jenistrx': 3}));
                    });

                    promiseEditStock.then(function (rowEditStock) {
                        grandTotalEdit = (_.isNumber(_.sumBy(rowEditStock, 'totalbeli'))) ? _.sumBy(rowEditStock, 'totalbeli') : 0;
                        //console.log(grandTotalEdit);

                    }).then(function () {
                        //ADD EXPENSE = minus
                        var promiseAddExp = new Promise(function (resolve, reject) {
                            resolve(_.filter(rowItem, {'jenistrx': 4}));
                        });

                        promiseAddExp.then(function (rowAddExp) {
                            grandTotalExp = (_.isNumber(_.sumBy(rowAddExp, 'totaljual'))) ? _.sumBy(rowAddExp, 'totaljual') : 0;
                            //console.log(grandTotalEdit);

                        }).then(function () {
                            //delete EXPENSE = plus
                            var promiseDeleteExp = new Promise(function (resolve, reject) {
                                resolve(_.filter(rowItem, {'jenistrx': 5}));
                            });

                            promiseDeleteExp.then(function (rowDeleteExp) {
                                grandTotalDelExp = (_.isNumber(_.sumBy(rowDeleteExp, 'totalbeli'))) ? _.sumBy(rowDeleteExp, 'totalbeli') : 0;
                                //console.log(grandTotalEdit);

                            }).then(function () {

                                res.render('income-report', {
                                    rows: rowItem,
                                    template: groupedOrderid,
                                    grandTotalJual: (grandTotalJual + grandTotalDelExp),
                                    grandTotalBeli: (grandTotalBeli + grandTotalEdit + grandTotalExp),
                                    totalLaba: ((grandTotalJual + grandTotalDelExp) - (grandTotalBeli + grandTotalEdit + grandTotalExp))
                                });

                            }).catch(function (error) {
                                //logs out the error
                                console.error(error);
                            });
                        });
                    });
                });
            });
        });
});

/* POST income page. */
router.post('/income-report', function(req, res) {
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
        var queryString = "select *, (hargajual*jumlah) totaljual,  (hargabeli*jumlah) totalbeli from trx " +
            "LEFT JOIN kode ON trx.idkode = kode.idkode " +
            "WHERE " +
            "trx.tanggal between '" + startDate + "' " +
            "AND '" + endDate + "' " +
            "order by trx.tanggal";
        tokoianConn.query(queryString)
            .then(function (rowItem) {
                var groupedOrderid = _.groupBy(rowItem, 'orderid');
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
                        if (!_.isEmpty(rowItem)) {
                            // console.log(rowItem);
                            // console.log(grandTotalBeli);
                            // console.log(grandTotalJual);
                            // console.log(grandTotalJual - grandTotalBeli);

                            res.render('income-report', {
                                rows: rowItem,
                                template: groupedOrderid,
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
});

/* GET log page. */
router.get('/log', function(req, res) {
    var dateMonth = moment().format("M");
    var dateYear = moment().format("YYYY");
    let periode = req.query.start || {};
    let perpage = 10;
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + ""+req.query.start+"&end=" + ""+req.query.end+"'"
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
                    console.error(error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(error);
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)
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
                    console.error(error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }

});

/* POST log page. */
router.post('/log', function(req, res) {
    var postDate = req.body.periode;
    let perpage = 10;
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
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
                                    "link" : ""+thisUrlPath+"?p="+encrypt(""+i)+"&start=" + encrypt(""+startDate)+"&end=" + encrypt(""+endDate)+"'"
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
                    console.error(error);
                });
            }).catch(function (error) {
            //logs out the error
            console.error(error);
        });

    }
});

/* GET print sales order page. */
router.get('/print-so', function(req, res) {
    var passedVariable = decrypt(req.query.so) || {};
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
        "where so.soid = '"+ passedVariable +"' " +
        // "where so.soid = '#SO-zTf1900002' " +
        "order by so.status desc, so.tanggal desc")
        .then(function (row) {
            // console.log(row[0].soid);
            return tokoianConn.query("select * " +
               "from company")
                .then(function (company) {
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
                    console.error(error);
                });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* GET print delivery order page. */
router.get('/print-do', function(req, res) {
    var passedVariable = decrypt(req.query.so) || {};
    console.log(passedVariable);
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
        "where so.soid = '"+ passedVariable +"' " +
        // "where so.soid = '#SO-zTf1900002' " +
        "order by so.status desc, so.tanggal desc")
        .then(function (row) {
            return tokoianConn.query("select * " +
               "from company")
                .then(function (company) {
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
                    console.error(error);
                });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* GET add sales order page. */
router.get('/add-expense', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    return tokoianConn.query("select orderid from trx where jenistrx = '4' order by tanggal desc limit 1")
        .then(function (row) {
            let getOrderId = (!_.isEmpty(row))?row[0].orderid : "00000";
            let maxOrderId = parseInt(getOrderId.slice(-5).replace(/[^0-9]/gi, ''));
            var orderid = "#EXP-" + randomize('?Aa0', 3, dateNow).concat(moment(Date.now()).format("YY"), ("00000" + (maxOrderId + 1)).slice(-5));

            switch (passedVariable) {
                case '1':
                    message = {"text": "Pengeluaran berhasil dibuat..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Pengeluaran gagal dibuat..!! "+ req.query.error, "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
            res.render('add-expense', {
                orderid : orderid,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* POST add sales order page. */
router.post('/add-expense', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postOrder = req.body.addExpense || {};
    let queryItemString = "";
    let queryTrxString = "";
    let queryLogString = "";
    let trxPush;
    let itemPush;
    let logPush;
    if (!_.isUndefined(req.body.addExpenseSubmit)){
        return Promise.each(postOrder, function (expense) {
            let nominal = parseInt(expense.nominal.replace(/[^0-9]/gi, ''));
            queryItemString = "INSERT INTO expense (nama, orderid, nominal, tanggal) VALUES " +
                "('" + expense.nama + "','" + expense.orderid + "', '" + nominal + "', '" + dateNow + "')";

            queryTrxString = "INSERT INTO trx (expense, orderid, hargabeli, tanggal, jenistrx, jumlah) VALUES " +
                "('" + expense.nama + "','" + expense.orderid + "', '" + nominal + "', '" + dateNow + "', '4', '1')";

            let logString = "Order ID : " + expense.orderid + "\n" +
                "Deskripsi Pengeluaran : " + expense.nama + "\n" +
                "Nominal : " + expense.nominal;

            queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                "('" + user + "', 'Input Pengeluaran','" + logString + "','" + dateNow + "')";

            itemPush = tokoianConn.query(queryItemString);
            trxPush = tokoianConn.query(queryTrxString);
            logPush = tokoianConn.query(queryLogString);
        }).then(function () {
            Promise.all([itemPush, trxPush, logPush])
                .then(function () {
                    let string = encodeURIComponent("1");
                    res.redirect('/add-expense?respost=' + string);
                }).catch(function (error) {
                //logs out the error
                let string = encodeURIComponent("2");
                console.error(error);
                var errorStr = encodeURIComponent(error);
                res.redirect('/add-expense?respost=' + string +'&error='+error);
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }
});

/* GET recap-expense page. */
router.get('/recap-expense', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    return tokoianConn.query("select * " +
        "from expense " +
        "order by status desc, tanggal desc")
        .then(function (row) {
            switch (passedVariable) {
                case '1':
                    message = {"text": "Expense berhasil dihapus..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Expense gagal dihapus..!! "+ req.query.error, "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
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
});

/* POST recap expense. */
router.post('/recap-expense', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let queryExpStr = "";
    let queryTrxStr = "";
    let arrayTrxQry = [];
    let queryLogString = "";
    let queryItemString = "";
    let queryTrxString = "";
    var trxPush = "";
    var expPush = "";
    var logPush = "";
    if (!_.isUndefined(req.body.hapusEpxBtn)) { //DELETE SO
        return tokoianConn.query("select * " +
            "from expense " +
            "where orderid = '"+ req.body.deletedExpId +"'")
            .then(function (rows) {
                return Promise.each(rows, function (exprow) {
                    arrayTrxQry.push([exprow.nama, exprow.orderid, exprow.nominal, dateNow, '5', '1']);
                }).then(function (rows) {
                    queryTrxStr = "INSERT INTO trx (expense, orderid, hargajual, tanggal, jenistrx, jumlah) VALUES?";

                    queryExpStr = "UPDATE expense SET status='0' WHERE orderid = '"+ req.body.deletedExpId +"'";

                    let logString = "Expense ID : " + req.body.deletedExpId;

                    queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                        "('" + user + "', 'Expense Dihapus','" + logString + "','" + dateNow + "')";

                    trxPush = tokoianConn.query(queryTrxStr, [arrayTrxQry]);
                    logPush = tokoianConn.query(queryLogString);
                    expPush = tokoianConn.query(queryExpStr);

                    Promise.all([trxPush, logPush, expPush])
                        .then(function () {
                            let string = encodeURIComponent("1");
                            res.redirect('/recap-expense?respost=' + string);
                        }).catch(function (error) {
                            //logs out the error
                            let string = encodeURIComponent("2");
                            console.error(error);
                            var errorStr = encodeURIComponent(error);
                            res.redirect('/recap-expense?respost=' + string +'&error='+error);
                        });
                }).catch(function (error) {
                    //logs out the error
                    console.error(error);
                });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET customer SO. */
router.get('/pl-customer-list', function(req, res) {
    var passedVariable = req.query.respost || {};
    var idcustomer = req.query.so || {};
    var message = {"text": "", "color": ""};
    let customer = {"nama": "", "alamat": "", "id": ""};
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
            .then(function (row) {
                return tokoianConn.query("select * " +
                    "from customer " +
                    "where idcustomer = '"+ decrypt(idcustomer) +"' ")
                    .then(function (customers) {
                        switch (passedVariable) {
                            case '1':
                                message = {"text": "Pricelist berhasil diedit..", "color": "green"};
                                break;
                            case '2':
                                message = {"text": "Pricelist gagal diedit..!! "+ req.query.error, "color": "red"};
                                break;
                            default :
                                message = {"text": "", "color": ""};
                                break;
                        }
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

            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }else{
        res.redirect('/customer-list');
    }
});/* POST customer so. */
router.post('/pl-customer-list', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postPl = req.body.editPl;
    let idkode = decrypt(req.body.editPlBtn);
    let hargajual = parseInt(postPl.hargajual.replace(/[^0-9]/gi, ''));
    let queryPlString = "";
    if (!_.isUndefined(req.body.editPlBtn)) {
        return tokoianConn.query("select * " +
            "from pricelist " +
            "where " +
            "idcustomer = '"+ postPl.customer +"' and " +
            "idkode = '"+ idkode +"'")
            .then(function (rows) {
                console.log(rows);
                if (!_.isEmpty(rows)) {
                    queryPlString = "UPDATE pricelist SET " +
                        "hargajual = '" + postPl.hargajual + "' " +
                        "idcustomer = '"+ rows[0].idcustomer +"' and " +
                        "idkode = '"+ rows[0].idkode;
                }else {
                    queryPlString = "INSERT INTO pricelist (idcustomer, idkode, hargajual) VALUES " +
                        "('" + postPl.customer + "','" + idkode + "', '" + hargajual + "')";
                }
                let logString = "Nama Toko : " + postPl.namatoko + "\n" +
                    "Kode Barang : " + postPl.namabarang + "\n" +
                    "Nama Barang : " + postPl.kodebarang;

                let queryLogString = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
                    "('" + user + "', 'Edit Pricelist','" + logString + "','" + dateNow + "')";

                var plPush = tokoianConn.query(queryPlString);
                var logPush = tokoianConn.query(queryLogString);

                Promise.all([plPush, logPush])
                    .then(function () {
                        let string = encodeURIComponent("1");
                        res.redirect('/pl-customer-list?respost=' + string + '&so=' + encrypt(postPl.customer));
                    }).catch(function (error) {
                        //logs out the error
                        let string = encodeURIComponent("2");
                        console.error(error);
                        var errorStr = encodeURIComponent(error);
                        res.redirect('/pl-customer-list?respost=' + string + '&so=' + encrypt(postPl.customer) +'&error='+error);
                    });
            }).catch(function (error) {
                //logs out the error
                console.error(error);
            });
    }
});

/* GET code-list page. */
router.get('/user-manager', function(req, res) {
    var passedVariable = req.query.respost || {};
    var message = {"text": "", "color": ""};
    return tokoianConn.query("select * from user order by priv, nama")
        .then(function (listUser) {
            switch (passedVariable) {
                case '1':
                    message = {"text": "User berhasil ditambah..", "color": "green"};
                    break;
                case '2':
                    message = {"text": "Tambah user gagal..!! "+ req.query.error, "color": "red"};
                    break;
                case '3':
                    message = {"text": "Edit user berhasil..", "color": "green"};
                    break;
                case '4':
                    message = {"text": "Edit user gagal..!! "+ req.query.error, "color": "red"};
                    break;
                default :
                    message = {"text": "", "color": ""};
                    break;
            }
            res.render('user', {
                listUser : listUser,
                message: message
            });
        }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
});

/* POST add-code page. */
router.post('/user-manager', function(req, res) {
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var user = req.session.name;
    let postUser = req.body.addUser;
    var arrayUserQuery = [];
    var arrayLogQuery = [];
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

        var pushKode = tokoianConn.query(queryUserString, [arrayUserQuery]);
        var pushLog = tokoianConn.query(queryLogString, [arrayLogQuery]);

        Promise.all([pushKode, pushLog])
            .then(function (results) {
                // console.log(results);
                var string = encodeURIComponent("1");
                res.redirect('/user-manager?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            console.error(error);
            var string = encodeURIComponent("2");
            var errorStr = encodeURIComponent(error);
            res.redirect('/user-manager?respost=' + string +'&error='+error);
        });
    }else if (!_.isUndefined(req.body.editUserSubmit)){
        var updateUser = "UPDATE user SET nama =  '" + req.body.editUser.nama + "', username =  '" + req.body.editUser.username + "', password =  '" + encrypt(req.body.editUser.password) + "' where iduser = '" + decrypt(req.body.editUserSubmit) + "'";

        let logString = "Username : " + req.body.editUser.usernameOld + "\n" +
            "Nama : " + req.body.editUser.namaOld + "\n" +
            "Updated to :\n " +
            "Username : " + req.body.editUser.username + "\n" +
            "Nama : " + req.body.editUser.namaOld;
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Edit Detail User','" + logString + "','" + dateNow + "')";
        var UserPush = tokoianConn.query(updateUser);
        var logPush = tokoianConn.query(insertLog);
        Promise.all([UserPush, logPush])
            .then(function () {
                var string = encodeURIComponent("3");
                res.redirect('/user-manager?respost=' + string);
            }).catch(function (error) {
            //logs out the error
            console.error(error);
            var string = encodeURIComponent("4");
            var errorStr = encodeURIComponent(error);
            res.redirect('/user-manager?respost=' + string +'&error='+error);
        });
    }
});

/* GET AJAX user-list page. */
router.get('/priv-user', function(req, res) {
    var user = req.session.name;
    var dateNow = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss");
    var passedVariable = req.query.changeStatus || {};
    var iduser = decrypt(req.query.priv) || {};
    var updatePriv = "UPDATE user SET priv =  '" + passedVariable + "' where iduser = '" + iduser + "'";
    // console.log(updatePriv);
    return tokoianConn.query("select * from user " +
        "where iduser = '" + iduser + "'").then(function (listUser) {

        var logString = "User Name : " + listUser[0].username + "\n" +
            "Nama : " + listUser[0].nama + "\n" +
            "Privilege to : " + (passedVariable === '1')? "Administrator" : "Operator" + "\n";
        var insertLog = "INSERT INTO log (user, aksi, detail, tanggal) VALUES " +
            "('" + user + "', 'Edit Privilege','" + logString + "','" + dateNow + "')";
        var userPush = tokoianConn.query(updatePriv);
        var logPush = tokoianConn.query(insertLog);
        Promise.all([userPush, logPush])
            .then(function () {
                res.send("ok");
            }).catch(function (error) {
            //logs out the error
            console.error(error);
        });
    }).catch(function (error) {
        //logs out the error
        console.error(error);
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
