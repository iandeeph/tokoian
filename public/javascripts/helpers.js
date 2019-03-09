var moment          = require('moment');
var _               = require('lodash');
var Handlebars      = require('handlebars');

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
            parse = "Edit Inventory";
            break;

        default:
            parse = "error";
            break;
    }
    return parse;
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