var today = new Date();
var day = today.getDate();
day ='#tanggal' + day;
var numFieldTrx = 1;
var autocompleteData = {};
let datepickerElm = $('.datepicker');

$(document).ready(function() {
    $(".sidenav").sidenav();
    $('.collapsible').collapsible(
        {hover: false}
    );
    $('select').formSelect();
    $('#customer').formSelect();
    $('.tooltipped').tooltip({delay: 50});
    $(datepickerElm).datepicker();
    $(datepickerElm).click(function(){
        $(".datepicker-day-button").click(function(){
            // using timeout so it doesn't seem sudden to user
            setTimeout(function(){
                $('.datepicker-done').click()
            }, 200)
        });
    });
    $('.modal').modal();

    let printPage = $('#printPage');
    $(printPage).click(function () {
        window.close();
    });

    // ===================== user page =========================
    $('input[id^=userPriv]').change(function(){
        let priv = $(this).attr("data-text");
        let iduser = $(this).attr("data-kode");
        $.ajax({
            url: './priv-user?changeStatus='+ priv +'&priv='+iduser,
            type: "GET",
            success: function (datas) {
            }
        });
    });

    // ============= pl customer list =================
    $('[id^=modalEditBtn]').click(function () {
        let id = $(this).attr('data-text');
        console.log('#hargaJual'+id);
        setTimeout(function() { $('#hargaJual'+id).select() }, 200);
    });


    $('input[id^=hargaJual]').each(function(){
        $(this).keyup(function(){
            var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
            $(this).val(Intl.NumberFormat('en-IND').format(number))
        });
    });

    // ======== print invoice ==================
    $('[id^=printInvoice]').click(function () {
        let so = $(this).val();
        var printWindow = window.open('./print-so?so='+ so);
        printWindow.onload = function(e){
            printWindow.print();
            printWindow.onfocus = function () { setTimeout(function () { printWindow.close(); }, 0); };
        };
    });

    // ======== print DO ==================
    var doPage = $('#print-do-page');
    if($(doPage).length > 0){
        setTimeout(function () { window.print(); }, 500);
        window.onfocus = function () { setTimeout(function () { window.location.replace("./recap-sales-order"); }, 500); };
        $(doPage).click(function () { setTimeout(function () { window.location.replace("./recap-sales-order"); }, 500); });
    }

    // ================== HOME PAGE =====================
    var topChart = $('#topSaleChart');
    if($(topChart).length > 0){
        function random_rgba(jumlah = 1, trans = 1) {
            var o = Math.round, r = Math.random, s = 255;
            var rgba = [];
            for (i = 1; i <= jumlah; i++){
                rgba.push('rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ',' + trans + ')');
            }
            return rgba;
        }

        $.ajax({
            url: './get-top-chart',
            type: "GET",
            success: function (datas) {
                var chart = new Chart(topChart, {
                    type: 'bar',
                    data: {
                        labels: datas.labels,
                        datasets: [{
                            label: 'Top Chart Penjualan',
                            data: datas.data,
                            backgroundColor: random_rgba(Object.keys(datas.data).length, 0.4),
                            borderColor: random_rgba(Object.keys(datas.data).length, 1),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });
            }
        });

    }
    //================ page add kode ==================
    $("#btnAddKode").click(function () {
        let kodeField = $("#kodeField");
        let newInput = $('' +
            '<div class="row addedTrx'+ numFieldTrx +'">' +
            '<div class="input-field col s4">' +
            '<input id="kode-produk'+ numFieldTrx +'" name="listKode['+ numFieldTrx +'][kode]" type="text" class="validate" required>' +
            '<label for="kode-produk'+ numFieldTrx +'">Kode Produk</label>' +
            '</div>' +
            '<div class="input-field col s6">' +
            '<input id="nama-produk'+ numFieldTrx +'" name="listKode['+ numFieldTrx +'][nama]" type="text" class="validate" required>' +
            '<label for="nama-produk'+ numFieldTrx +'">Nama Produk</label>' +
            '</div>' +
            '<div class="col s2 mt-10 addedTrx'+ numFieldTrx +'">' +
            '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
            '</div>');
        $(kodeField).append(newInput);
        $('select').formSelect();
        numFieldTrx++;

        $('[name^=btnRemTrx]').click(function () {
            var numToRem = $(this).attr('id');
            var elm = ".addedTrx"+ numToRem;

            $(elm).remove();
        });
    });

    $('input[id^=statusKode]').change(function(){
        let idkode = $(this).attr("data-text");
        let kode = $(this).attr("data-kode");
        $.ajax({
            url: './status-code?changeStatus='+ idkode +'&kode='+kode,
            type: "GET",
            success: function (datas) {
                var alertString = "Jumlah stock tidak kosong!!";
                if(datas === "Not Empty"){
                    alert(alertString);
                    location.reload();
                }
            }
        });
    });

    //================ page order in ==================
    function autoFillOrderIn(){
        $("[id^=kode-produk]").change(function () {
            let parentForm = $(this).closest('.row');
            let parentDivNama =
            $.ajax({
                url: './get-item?id='+ $(this).val(),
                type: "GET",
                dataType: "json",
                success: function (datas) {
                    // console.log(datas);
                    if(datas.length > 0){
                        $(parentForm).find('input[id^=nama-produk]').val(datas[0].nama);
                        $(parentForm).find('input[id^=nama-produk]').closest('div').find('label').addClass("active");
                        $(parentForm).find('input[id^=hargaBeli]').val(Intl.NumberFormat('en-IND').format(datas[0].hargabeli));
                        $(parentForm).find('input[id^=hargaBeli]').closest('div').find('label').addClass("active");
                    }
                }
            });
        });
    }


    var btnOrderIn = $('#ordeInSubmit');
    if($(btnOrderIn).length > 0){
        $.ajax({
            url: './get-item',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                for (var keyDatas in datas) {
                    if (!datas.hasOwnProperty(keyDatas)) continue;
                    var resDatas = datas[keyDatas];
                    autocompleteData[resDatas.kode] = null;
                }
                // console.log(autocompleteData);
                $('input.autocompleteOrderIn').autocomplete({
                    data: autocompleteData
                });

                $("[id^=btnAddOrderIn]").click(function () {
                    let orderid = $("#orderId").val();
                    $("#orderInField").append('' +
                        '<div class="row addedTrx'+ numFieldTrx +'">' +
                        '<div class="input-field col s10 m3 l3">' +
                        '<input id="orderId'+ numFieldTrx +'" name="inOrder['+ numFieldTrx +'][orderid]" type="hidden" value="'+ orderid +'">' +
                        '<input id="kode-produk'+ numFieldTrx +'" name="inOrder['+ numFieldTrx +'][kode]" type="text" class="validate autocompleteOrderIn" required>' +
                        '<label for="kode-produk'+ numFieldTrx +'">Kode Produk</label>' +
                        '</div>' +
                        '<div class="col s1 mt-10 mr-10 hide-on-med-and-up">' +
                        '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                        '</div>' +
                        '<div class="input-field col s12 m4 l4">' +
                        '<input id="nama-produk'+ numFieldTrx +'" name="inOrder['+ numFieldTrx +'][nama]" type="text" class="validate" disabled>' +
                        '<label for="nama-produk'+ numFieldTrx +'">Nama Produk</label>' +
                        '</div>' +
                        '<div class="input-field col s12 m2 l2">' +
                        '<input id="hargaBeli'+ numFieldTrx +'" name="inOrder['+ numFieldTrx +'][hargabeli]" type="text" class="validate" required>' +
                        '<label for="hargaBeli'+ numFieldTrx +'">Harga Beli</label>' +
                        '</div>' +
                        '<div class="input-field col s12 m2 l2">' +
                        '<input id="jumlah'+ numFieldTrx +'" name="inOrder['+ numFieldTrx +'][jumlah]" type="number" class="validate" required>' +
                        '<label for="jumlah'+ numFieldTrx +'">Jumlah</label>' +
                        '</div>' +
                        '<div class="col m1 l1 mt-10 hide-on-small-only">' +
                        '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                        '</div>' +
                        '</div>');

                    $('input.autocompleteOrderIn').autocomplete({
                        data: autocompleteData
                    });

                    autoFillOrderIn();
                    numFieldTrx++;

                    $('[name^=btnRemTrx]').click(function () {
                        var numToRem = $(this).attr('id');
                        var elm = ".addedTrx"+ numToRem;

                        $(elm).remove();
                    });
                });
            }
        });
        autoFillOrderIn();
        $('input[id^=hargaBeli], input[id^=jumlah]').each(function(){
            $(this).keyup(function(){
                var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                $(this).val(Intl.NumberFormat('en-IND').format(number))
            });
        });
    }

    //================ page sales order ==================
    let btnSoSubmit = $('#addSoSubmit');
    function autoFillSo(){
        $("[id^=kode-produk]").change(function () {
            // console.log($(this).val());
            let parentForm = $(this).closest('.row');
                $.ajax({
                    url: './get-item?id='+ $(this).val() +'&cust='+ $('#customerId').val(),
                    type: "GET",
                    dataType: "json",
                    success: function (datas) {
                        // console.log(datas);
                        if(datas.length > 0){
                            if(datas[0].hargajual == null){
                                $(parentForm).find('input[id^=harga-Jual]').val(Intl.NumberFormat('en-IND').format(0));
                                $(parentForm).find('input[id^=hargaJual]').val(Intl.NumberFormat('en-IND').format(0));
                                $(btnSoSubmit).addClass('disabled');
                                $(btnSoSubmit).prop('disabled', true);
                            }else{
                                $(parentForm).find('input[id^=harga-Jual]').val(Intl.NumberFormat('en-IND').format(datas[0].hargajual));
                                $(parentForm).find('input[id^=hargaJual]').val(Intl.NumberFormat('en-IND').format(datas[0].hargajual));
                                $(btnSoSubmit).removeClass('disabled');
                                $(btnSoSubmit).prop('disabled', false);
                            }
                            $(parentForm).find('input[id^=nama-produk]').val(datas[0].nama);
                            $(parentForm).find('input[id^=namaBarang]').val(datas[0].nama);
                            $(parentForm).find('input[id^=kodeId]').val(datas[0].idkode);
                            $(parentForm).find('input[id^=nama-produk]').closest('div').find('label').addClass("active");
                            $(parentForm).find('input[id^=harga-Jual]').closest('div').find('label').addClass("active");
                        }else{
                            $(parentForm).find('input[id^=nama-produk]').val("");
                            $(parentForm).find('input[id^=namaBarang]').val("");
                            $(parentForm).find('input[id^=hargaJual]').val("");
                            $(parentForm).find('input[id^=harga-Jual]').val("");
                            $(parentForm).find('input[id^=kodeId]').val("");
                            $(parentForm).find('input[id^=nama-produk]').closest('div').find('label').removeClass("active");
                            $(btnSoSubmit).addClass('disabled');
                            $(btnSoSubmit).prop('disabled', true);
                        }
                    }
                });
        });
    }

    function addSoBtnClick(datas){
        $("[id^=btnAddSo]").click(function () {
            $("#itemSoField").append('' +
                '<div class="row addedTrx'+ numFieldTrx +'">' +
                '<div class="input-field col s10 m3 l3">' +
                '<input id="namaBarang'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][nama]" type="hidden">' +
                '<input id="hargaJual'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][hargajual]" type="hidden">' +
                '<input id="kodeId'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][idkode]" type="hidden">' +
                '<select id="kode-produk'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][kode]" class="validate" required>' +
                '<option value="" disabled selected>Pilih Kode Produk</option>' +
                '</select>' +
                '<label for="kode-produk'+ numFieldTrx +'">Kode Produk</label>' +
                '</div>' +
                '<div class="col s1 mt-10 mr-10 hide-on-med-and-up">' +
                '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                '</div>' +
                '<div class="input-field col s12 m4 l4">' +
                '<input id="nama-produk'+ numFieldTrx +'" type="text" class="validate" disabled>' +
                '<label for="nama-produk'+ numFieldTrx +'">Nama Produk</label>' +
                '</div>' +
                '<div class="input-field col s12 m3 l3">' +
                '<input id="harga-Jual'+ numFieldTrx +'" type="text" class="validate" disabled>' +
                '<label for="harga-Jual'+ numFieldTrx +'">Harga Jual</label>' +
                '</div>' +
                '<div class="input-field col s12 m1 l1">' +
                '<input id="jumlah'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][jumlah]" type="number" class="validate" required>' +
                '<label for="jumlah'+ numFieldTrx +'">Jumlah</label>' +
                '</div>' +
                '<div class="col m1 l1 mt-10 hide-on-small-only">' +
                '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                '</div>' +
                '</div>');

            for (var keyDatas in datas) {
                if (!datas.hasOwnProperty(keyDatas)) continue;
                var resDatas = datas[keyDatas];
                $("#kode-produk"+ numFieldTrx).append('<option value="' + resDatas.kode + '">' + resDatas.kode + '</option>');
            }

            $('select').formSelect();

            $('input[id^=hargaBeli],input[id^=hargaJual], input[id^=jumlah]').each(function(){
                $(this).keyup(function(){
                    var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                    $(this).val(Intl.NumberFormat('en-IND').format(number));

                    $('input[id^=hargaJual]').each(function () {
                        if($(this).val() === "0"){
                            $(btnSoSubmit).addClass('disabled');
                            $(btnSoSubmit).prop('disabled', true);
                        }else{
                            $(btnSoSubmit).removeClass('disabled');
                            $(btnSoSubmit).prop('disabled', false);
                        }
                    })
                });
            });

            autoFillSo();
            numFieldTrx++;

            $('[name^=btnRemTrx]').click(function () {
                var numToRem = $(this).attr('id');
                var elm = ".addedTrx"+ numToRem;

                $(elm).remove();

                $(btnSoSubmit).removeClass('disabled');
                $(btnSoSubmit).prop('disabled', false);
            });
        });
    }

    if($(btnSoSubmit).length > 0){
        $("[id^=customer]").change(function () {
            $('#message').slideUp("slow");
            let soField = $("#itemSoField");
            let orderid = $("#orderId").val();
            let custBlock = $('#custDetailBlock');
            let curVal = $(this).val();
            $.ajax({
                url: './get-customer?id='+ curVal,
                type: "GET",
                dataType: "json",
                success: function (datas) {
                    // console.log(datas);
                    if(datas.length > 0){
                        let custStr = datas[0].nama +"<br/>" + datas[0].pic +" - "+ datas[0].telp +"<br/>Alamat : <br/>" + datas[0].alamat;
                        $('.card-panel').removeClass("z-depth-0");
                        $(custBlock).removeClass("hide");
                        $('#customerDetail').html(custStr);
                        $('#customerId').val(datas[0].idcustomer);
                    }else{
                        $(custBlock).addClass("hide");
                        $('#customerId').val(null);
                    }
                }
            });
            $(soField).empty();
            $.ajax({
                url: './get-item',
                type: "GET",
                dataType: "json",
                success: function (datas) {
                    $(soField).append('' +
                        '<div class="row addedTrx'+ numFieldTrx +'">' +
                        '<div class="input-field col s10 m3 l3">' +
                        '<input id="namaBarang'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][nama]" type="hidden">' +
                        '<input id="hargaJual'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][hargajual]" type="hidden">' +
                        '<input id="kodeId'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][idkode]" type="hidden">' +
                        '<select id="kode-produk'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][kode]" class="validate" required>' +
                        '<option value="" disabled selected>Pilih Kode Produk</option>' +
                        '</select>' +
                        '<label for="kode-produk">Kode Produk</label>' +
                        '</div>' +
                        '<div class="col s1 mt-10 mr-10 hide-on-med-and-up">' +
                        '<a class="btn-floating btn waves-effect waves-light green darken-3" id="btnAddSo-bot" title="Tambah Barang"><i class="material-icons">add</i></a>' +
                        '</div>' +
                        '<div class="input-field col s12 m4 l4">' +
                        '<input id="nama-produk'+ numFieldTrx +'" type="text" class="validate" disabled>' +
                        '<label for="nama-produk'+ numFieldTrx +'">Nama Produk</label>' +
                        '</div>' +
                        '<div class="input-field col s12 m3 l3">' +
                        '<input id="harga-Jual'+ numFieldTrx +'" type="text" class="validate" disabled>' +
                        '<label for="harga-Jual'+ numFieldTrx +'">Harga Jual</label>' +
                        '</div>' +
                        '<div class="input-field col s12 m1 l1">' +
                        '<input id="jumlah'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][jumlah]" type="number" class="validate" required>' +
                        '<label for="jumlah'+ numFieldTrx +'">Jumlah</label>' +
                        '</div>' +
                        '<div class="col m1 l1 mt-10 hide-on-small-only">' +
                        '<a class="btn-floating btn waves-effect waves-light green darken-3" id="btnAddSo-bot" title="Tambah Barang"><i class="material-icons">add</i></a>' +
                        '</div>' +
                        '</div>');

                    for (var keyDatas in datas) {
                        if (!datas.hasOwnProperty(keyDatas)) continue;
                        var resDatas = datas[keyDatas];
                        $("#kode-produk"+ numFieldTrx).append('<option value="' + resDatas.kode + '">' + resDatas.kode + '</option>');
                    }

                    $('select').formSelect();

                    $('input[id^=hargaBeli],input[id^=hargaJual], input[id^=jumlah]').each(function(){
                        $(this).keyup(function(){
                            var number = ($(this).val() !== '' && $(this).val() !== 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                            $(this).val(Intl.NumberFormat('en-IND').format(number));

                            $('input[id^=hargaJual]').each(function () {
                                if($(this).val() === "0"){
                                    $(btnSoSubmit).addClass('disabled');
                                    $(btnSoSubmit).prop('disabled', true);
                                }else{
                                    $(btnSoSubmit).removeClass('disabled');
                                    $(btnSoSubmit).prop('disabled', false);
                                }
                            })
                        });
                    });

                    autoFillSo();
                    addSoBtnClick(datas);
                    numFieldTrx++;
                }
            });
        });

        $.ajax({
            url: './get-item',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                addSoBtnClick(datas);
            }
        });
        autoFillSo();
        $('input[id^=hargaBeli],input[id^=hargaJual], input[id^=jumlah]').each(function(){
            $(this).keyup(function(){
                var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                $(this).val(Intl.NumberFormat('en-IND').format(number));

                $('input[id^=hargaJual]').each(function () {
                    if($(this).val() === "0"){
                        $(btnSoSubmit).addClass('disabled');
                        $(btnSoSubmit).prop('disabled', true);
                    }else{
                        $(btnSoSubmit).removeClass('disabled');
                        $(btnSoSubmit).prop('disabled', false);
                    }
                })
            });
        });
    }

//================ page customer list ==================
    $('input[id^=statusCustomer]').change(function(){
        let status = $(this).attr("data-text");
        let id = $(this).attr("data-kode");
        $.ajax({
            url: './cust-status-code?changeStatus='+ status +'&kode='+id,
            type: "GET",
            success: function (datas) {
            }
        });
    });

    // ==================== add expense ==============
    $("[id^=btnAddExp]").click(function () {
        let orderid = $("#orderId").val();
        $("#expenseField").append('' +
            '<div class="row addedTrx'+ numFieldTrx +'">' +
            '<div class="input-field col s10 m7 l7">' +
            '<input id="orderId'+ numFieldTrx +'" name="addExpense['+ numFieldTrx +'][orderid]" type="hidden" value="'+ orderid +'">' +
            '<input id="expense'+ numFieldTrx +'" name="addExpense['+ numFieldTrx +'][nama]" type="text" class="validate autocompleteOrderIn" required>' +
            '<label for="expense'+ numFieldTrx +'">Deskripsi Pengeluaran</label>' +
            '</div>' +
            '<div class="col s1 mt-10 mr-10 hide-on-med-and-up">' +
            '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
            '</div>' +
            '<div class="input-field col s12 m3 l3">' +
            '<input id="nominal'+ numFieldTrx +'" name="addExpense['+ numFieldTrx +'][nominal]" type="text" class="validate" required>' +
            '<label for="nominal'+ numFieldTrx +'">Nominal</label>' +
            '</div>' +
            '<div class="col m1 l1 mt-10 hide-on-small-only">' +
            '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
            '</div>' +
            '</div>');

        numFieldTrx++;

        $('[name^=btnRemTrx]').click(function () {
            var numToRem = $(this).attr('id');
            var elm = ".addedTrx"+ numToRem;

            $(elm).remove();
        });
        $('input[id^=nominal]').keyup(function(){
            var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
            $(this).val(Intl.NumberFormat('en-IND').format(number))
        });
    });
    $('#nominal').keyup(function(){
        var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
        $(this).val(Intl.NumberFormat('en-IND').format(number))
    });
});

