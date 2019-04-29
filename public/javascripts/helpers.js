var moment          = require('moment');
var _               = require('lodash');
var Handlebars      = require('handlebars');
const {createCipher, createCipheriv, createDecipher, createDecipheriv, randomBytes} = require('crypto');
const algorithm = 'aes-256-ctr';
const key = process.env.KEY || 'b2df428b9929d3ace7c598bbf4e496b2';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

exports.readableDate = function (date) {
    var parse = "";
    if(_.isDate(date)){
        parse = moment(date).format("D-MMM-YYYY HH:mm:ss");
    }else{
        parse = "-";
    }

    return parse;
};

exports.readableFullDate = function (date) {
    var parse = "";
    if(_.isDate(date)){
        parse = moment(date).format("D-MMM-YYYY");
    }else{
        parse = "-";
    }

    return parse;
};

exports.bulanTahun = function (date) {
    var parse = "";
    if(_.isDate(date)){
        parse = moment(date).format("MMMM-YYYY");
    }else{
        parse = "-";
    }

    return parse;
};

exports.fullDate = function (date) {
    var parse = "";
    if(_.isDate(date)){
        parse = moment(date).format("YYYY-MM-DD");
    }else{
        parse = "-";
    }

    return parse;
};

exports.dateTime = function (date) {
    var parse = "";
    if(_.isDate(date)){
        parse = moment(date).format("YYYY-MM-DD HH:mm:ss");
    }else{
        parse = "-";
    }

    return parse;
};

exports.numbyIndex = function (index) {
    var parse = "";
    parse = parseInt(index) + 1;

    return parse;
};

exports.indexOf = function (object, key) {
    var parse;
    var arr = _.toArray(object);
    console.log(object);
    console.log(key);
    console.log(_.indexOf(arr, key));
    parse = (parseInt(_.indexOf(object, key)) + 1);

    return parse;
};

exports.section = function(name, options){
    if(!this._sections) this._sections = {};
    this._sections[name] = options.fn(this);
    return null;
};

exports.joinText = function(a, b){
    var joinRes = "";
    if(_.isEmpty(a) || _.isEmpty(b) ||  _.isNull(a) || _.isNull(b)){
        joinRes = "";
    }else{
        joinRes = a+" ("+b+")";
    }
    return joinRes;
};

exports.nl2br = function(str, is_xhtml){
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br/>' : '<br>';
    return decodeURIComponent((str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2'));
};

exports.sums = function(a,b){
    return currencyFormatter.format(_.sumBy(a, b), { code: 'IDR' });
};

exports.breakLine = function(text){
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
};

exports.zeroOrNumber = function (number) {
    var parse = "";
    if(_.isNull(number)){
        parse = 0;
    }else{
        parse = number;
    }

    return parse;
};

exports.stripForNull = function (string) {
    var parse = "";
    if(_.isNull(string) || _.isEmpty(string)){
        parse = "-";
    }else{
        parse = string;
    }

    return parse;
};

exports.numberFormat = function (number) {
    var parse = 0;
    if(_.isNull(number)){
        number = 0;
    }
    number = parseInt(number);
    //console.log(number);
    if(_.isNumber(number)){
        parse = Intl.NumberFormat('en-IND').format(parseInt(number));
    }else{
        parse = 0;
    }
    return parse;
};

exports.toTimes = function (number, number2) {
    var parse;
    if(!_.isEmpty(number)){
        var tmpNum = (parseInt(number) * parseInt(number2));
        parse = Intl.NumberFormat('en-IND').format(tmpNum);
    }else {
        parse = 0;
    }
    return parse;
};

exports.maxKey = function (object) {
    var maxKey;
    maxKey = (_.keys(object).length + 1);
    //maxKey = _.keys(object).length;
    return maxKey;
};

exports.jenisTrx = function (num) {
    var parse;
    switch (num){
        case 1 :
            parse = "Beli";
            break;

        case 2 :
            parse = "Jual";
            break;

        case 3 :
            parse = "Reopen SO";
            break;

        case 4 :
            parse = "Expense";
            break;

        case 5 :
            parse = "Delete Expense";
            break;

        default:
            parse = "error";
            break;
    }
    return parse;
};

exports.expenseStatus = function (num) {
    var parse;
    switch (num){
        case 1 :
            parse = "Done";
            break;

        case 0 :
            parse = "Dihapus";
            break;

        default:
            parse = "error";
            break;
    }
    return parse;
};

exports.statusParser = function (status) {
    var parse;
    switch (status){
        case '1' :
            parse = "Aktif";
            break;

        case '2' :
            parse = "Non Aktif";
            break;

        default:
            parse = "error";
            break;
    }
    return parse;
};

exports.invertStatus = function (status) {
    var parse;
    switch (status){
        case 1 :
            parse = "0";
            break;

        case 0 :
            parse = "1";
            break;

        default:
            parse = status;
            break;
    }

    // console.log(parse);
    return parse;
};

exports.invertPriv = function (status) {
    var parse;
    switch (status){
        case '1' :
            parse = "2";
            break;

        case '2' :
            parse = "1";
            break;

        default:
            parse = status;
            break;
    }

    // console.log(parse);
    return parse;
};

exports.parsePriv = function (status) {
    var parse;
    switch (status){
        case '1' :
            parse = "Administrator";
            break;

        case '2' :
            parse = "Operator";
            break;

        default:
            parse = status;
            break;
    }

    // console.log(parse);
    return parse;
};

exports.toUppercase = function (str) {
    var parse;
    parse = str.toUpperCase();
    return parse;
};

exports.soStatusParser = function (str) {
    var parse;
    switch (str){
        case "Open" :
            parse = "green-text darken-2";
            break;

        case "Deleted" :
            parse = "red-text darken-2";
            break;

        case "Done" :
            parse = "blue-text darken-2";
            break;

        default:
            parse = "";
            break;
    }
    return parse;
};

exports.encodeURI = function (str) {
    // console.log(encodeURI(str));
    return encodeURI(str);
};

exports.compare = function(lvalue, rvalue, options) {

    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

    var operator = options.hash.operator || "==";

    var operators = {
        '==':       function(l,r) { return l == r; },
        '===':      function(l,r) { return l === r; },
        '!=':       function(l,r) { return l != r; },
        '<':        function(l,r) { return l < r; },
        '>':        function(l,r) { return l > r; },
        '<=':       function(l,r) { return l <= r; },
        '>=':       function(l,r) { return l >= r; },
        'typeof':   function(l,r) { return typeof l == r; }
    };

    if (!operators[operator])
        throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

    var result = operators[operator](lvalue,rvalue);

    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }

};

exports.encrypt = function(value) {
    if (!_.isEmpty(value) || !_.isUndefined(value)){
        let str = value.toString();
        const iv = new Buffer(randomBytes(16));
        const cipher = createCipheriv(algorithm, key, iv);
        let crypted = cipher.update(str, inputEncoding, outputEncoding);
        crypted += cipher.final(outputEncoding);
        return `${iv.toString('hex')}:${crypted.toString()}`;
    } else {
        return value;
    }
};

exports.decrypt = function(value) {
    if (!_.isEmpty(value) || !_.isUndefined(value)){
        const textParts = value.split(':');

        //extract the IV from the first half of the value
        const IV = new Buffer(textParts.shift(), outputEncoding);

        //extract the encrypted text without the IV
        const encryptedText = new Buffer(textParts.join(':'), outputEncoding);

        //decipher the string
        const decipher = createDecipheriv(algorithm, key, IV);
        let decrypted = decipher.update(encryptedText, outputEncoding, inputEncoding);
        decrypted += decipher.final(inputEncoding);
        return decrypted.toString();
    } else {
        return value;
    }
};

exports.formatRupiah = function(angka){
    var number_string = angka.toString(),
        split   		= number_string.split(','),
        sisa     		= split[0].length % 3,
        rupiah     		= split[0].substr(0, sisa),
        ribuan     		= split[0].substr(sisa).match(/\d{3}/gi);

    // tambahkan titik jika yang di input sudah menjadi angka ribuan
    if(ribuan){
        separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = !_.isUndefined(split[1]) ? rupiah + ',' + split[1] : rupiah;
    return 'Rp. ' + rupiah +',-';
};