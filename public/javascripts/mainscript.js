var today = new Date();
var day = today.getDate();
day ='#tanggal' + day;
var numFieldTrx = 1;
var autocompleteData = {};

$(document).ready(function() {
    $(".button-collapse").sideNav();
    $('.collapsible').collapsible(
        {hover: false}
    );
    $('select').material_select();
    $('.tooltipped').tooltip({delay: 50});
    $('.datepicker').pickadate({
        selectMonths: true, // Creates a dropdown to control month
        selectYears: 15, // Creates a dropdown of 15 years to control year,
        today: 'Today',
        clear: 'Clear',
        close: 'Ok',
        closeOnSelect: true // Close upon selecting a date,
    });
    $('.modal').modal();

    //================ page add kode ==================
    $("#btnAddKode").click(function () {
        $("#kodeField").append('' +
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
        $('select').material_select();
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
                        $(parentForm).find('input[id^=hargaBeli]').val(datas[0].hargabeli);
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
    function autoFillSo(){
        $("[id^=kode-produk]").change(function () {
            let parentForm = $(this).closest('.row');
                $.ajax({
                    url: './get-item?id='+ $(this).val(),
                    type: "GET",
                    dataType: "json",
                    success: function (datas) {
                        // console.log(datas);
                        if(datas.length > 0){
                            $(parentForm).find('input[id^=nama-produk]').val(datas[0].nama);
                            $(parentForm).find('input[id^=namaBarang]').val(datas[0].nama);
                            $(parentForm).find('input[id^=kodeId]').val(datas[0].idkode);
                            $(parentForm).find('input[id^=nama-produk]').closest('div').find('label').addClass("active");
                            $(parentForm).find('input[id^=hargaBeli]').val(Intl.NumberFormat('en-IND').format(datas[0].hargabeli));
                            $(parentForm).find('input[id^=hargaBeli]').closest('div').find('label').addClass("active");
                        }else{
                            $(parentForm).find('input[id^=nama-produk]').val("");
                            $(parentForm).find('input[id^=namaBarang]').val("");
                            $(parentForm).find('input[id^=kodeId]').val("");
                            $(parentForm).find('input[id^=nama-produk]').closest('div').find('label').removeClass("active");
                            $(parentForm).find('input[id^=hargaBeli]').val("");
                            $(parentForm).find('input[id^=hargaBeli]').closest('div').find('label').removeClass("active");
                        }
                    }
                });
        });
    }

    var btnSumbitSo = $('#addSoSubmit');
    if($(btnSumbitSo).length > 0){
        let autocompleteDataSO = {};
        $.ajax({
            url: './get-customer',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                if(datas.length > 0){
                    for (var keyDatas in datas) {
                        if (!datas.hasOwnProperty(keyDatas)) continue;
                        var resDatas = datas[keyDatas];
                        autocompleteDataSO[resDatas.nama] = null;
                    }
                    // console.log(autocompleteData);
                    $('input.autocompleteCustomerName').autocomplete({
                        data: autocompleteDataSO
                    });
                }
            }
        });
        $("[id^=customer]").change(function () {
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
                    }
                }
            });
        });
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
                $('input.autocompleteSo').autocomplete({
                    data: autocompleteData
                });

                $("[id^=btnAddSo]").click(function () {
                    let orderid = $("#orderId").val();
                    $("#itemSoField").append('' +
                        '<div class="row addedTrx'+ numFieldTrx +'">' +
                            '<div class="input-field col s10 m2 l2">' +
                                '<input id="kodeId'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][idkode]" type="hidden">' +
                                '<input id="orderId'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][orderid]" type="hidden" value="'+ orderid +'">' +
                                '<input id="kode-produk'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][kode]" type="text" class="validate autocompleteSo" required>' +
                                '<label for="kode-produk'+ numFieldTrx +'">Kode Produk</label>' +
                            '</div>' +
                            '<div class="col s1 mt-10 mr-10 hide-on-med-and-up">' +
                                '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                            '</div>' +
                            '<div class="input-field col s12 m3 l3">' +
                                '<input id="nama-produk'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][nama]" type="text" class="validate" disabled>' +
                                '<label for="nama-produk'+ numFieldTrx +'">Nama Produk</label>' +
                            '</div>' +
                            '<div class="input-field col s12 m2 l2">' +
                                '<input id="hargaBeli'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][hargabeli]" type="text" class="validate" disabled>' +
                                '<label for="hargaBeli'+ numFieldTrx +'">Harga Beli</label>' +
                            '</div>' +
                            '<div class="input-field col s12 m2 l2">' +
                                '<input id="hargaJual'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][hargajual]" type="text" class="validate" required>' +
                                '<label for="hargaJual'+ numFieldTrx +'">Harga Jual</label>' +
                            '</div>' +
                            '<div class="input-field col s12 m2 l2">' +
                                '<input id="jumlah'+ numFieldTrx +'" name="addSo['+ numFieldTrx +'][jumlah]" type="number" class="validate" required>' +
                                '<label for="jumlah'+ numFieldTrx +'">Jumlah</label>' +
                            '</div>' +
                            '<div class="col m1 l1 mt-10 hide-on-small-only">' +
                                '<a class="btn-floating btn waves-effect waves-light red darken-3 btnRemTrx'+ numFieldTrx +'" name="btnRemTrx'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus"><i class="material-icons">remove</i></a>' +
                            '</div>' +
                        '</div>');

                    $('input.autocompleteSo').autocomplete({
                        data: autocompleteData
                    });

                    $('input[id^=hargaBeli],input[id^=hargaJual], input[id^=jumlah]').each(function(){
                        $(this).keyup(function(){
                            var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                            $(this).val(Intl.NumberFormat('en-IND').format(number))
                        });
                    });

                    autoFillSo();
                    numFieldTrx++;

                    $('[name^=btnRemTrx]').click(function () {
                        var numToRem = $(this).attr('id');
                        var elm = ".addedTrx"+ numToRem;

                        $(elm).remove();
                    });
                });
            }
        });
        autoFillSo();
        $('input[id^=hargaBeli],input[id^=hargaJual], input[id^=jumlah]').each(function(){
            $(this).keyup(function(){
                var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
                $(this).val(Intl.NumberFormat('en-IND').format(number))
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

    // ================================================================================================================================================


    //================ page add-stock ==================
    var submitBtnStock = $('#addStockSubmit');
    if($(submitBtnStock).length > 0){
        $.ajax({
            url: './sending-full-content',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                for (var keyDatas in datas) {
                    if (!datas.hasOwnProperty(keyDatas)) continue;
                    var resDatas = datas[keyDatas];
                    autocompleteData[resDatas.kode] = null;
                }
                $('input.autocompleteOrderIn').autocomplete({
                    data: autocompleteData
                });
            }
        });
    }
    function ifNewKode(){
        //$('select[id^=addStockKode]').change(function(){
        //    var value = $(this).val();
        //    var parentTR = $(this).closest('tr');
        //    var parent = $(this).closest('tr').find('td[id^=inputKodeBlock]');
        //    var uniqueNum = $(parent).attr('data');
        //    var parentBlock = $(parent).attr('id');
        //
        //    if(value == "new"){
        //        $('.selectList'+ uniqueNum +'').remove();
        //        $('#'+parentBlock).append('<input class="inputListGroup" id="addStockKode-'+ uniqueNum +'" name="listStock['+ uniqueNum +'][kode]" type="text" required>');
        //        $(parentTR).find('input[id^=addStockNama]').attr('disabled',false);
        //        $(parentTR).find('input[id^=addStockNama]').removeClass('disabled');
        //        $(parentTR).find('input[id^=addStockMerek]').attr('disabled',false);
        //        $(parentTR).find('input[id^=addStockMerek]').removeClass('disabled');
        //        $(parentTR).find('input[id^=addStockJenis]').attr('disabled',false);
        //        $(parentTR).find('input[id^=addStockJenis]').removeClass('disabled');
        //        $(parentTR).find('textarea[id^=addStockDesc]').attr('disabled',false);
        //        $(parentTR).find('textarea[id^=addStockDesc]').removeClass('disabled');
        //        $(parentTR).find('textarea[id^=addStockCatatan]').attr('disabled',false);
        //        $(parentTR).find('textarea[id^=addStockCatatan]').removeClass('disabled');
        //        ifNewKode();
        //    }else{
        //        $.ajax({
        //            url: './sending-code-content?id='+value,
        //            type: "GET",
        //            dataType: "json",
        //            success: function (datas) {
        //                $(parentTR).find('input[id^=addStockNama]').val(datas[0].nama);
        //                $(parentTR).find('input[id^=addStockMerek]').val(datas[0].merek);
        //                $(parentTR).find('input[id^=addStockJenis]').val(datas[0].jenis);
        //                $(parentTR).find('input[id^=addStockHargabeli]').val(Intl.NumberFormat('en-IND').format(datas[0].hargabeli));
        //                $(parentTR).find('input[id^=addStockHargajual]').val(Intl.NumberFormat('en-IND').format(datas[0].hargajual));
        //                $(parentTR).find('textarea[id^=addStockDesc]').val(datas[0].deskripsi);
        //                $(parentTR).find('textarea[id^=addStockCatatan]').val(datas[0].catatan);
        //            }
        //        });
        //    }
        //});

        $('input[id^=addStockKode]').change(function(){
            var value = $(this).val();
            var parentTR = $(this).closest('tr');
            $.ajax({
                url: './sending-code-content?name='+encodeURIComponent(value),
                type: "GET",
                dataType: "json",
                success: function (datas) {
                    if(datas.length > 0){
                        $(parentTR).find('input[id^=addStockNama]').val(datas[0].nama);
                        $(parentTR).find('input[id^=addStockMerek]').val(datas[0].merek);
                        $(parentTR).find('input[id^=addStockJenis]').val(datas[0].jenis);
                        $(parentTR).find('input[id^=addStockHargabeli]').val(Intl.NumberFormat('en-IND').format(datas[0].hargabeli));
                        $(parentTR).find('input[id^=addStockHargajual]').val(Intl.NumberFormat('en-IND').format(datas[0].hargajual));
                        $(parentTR).find('textarea[id^=addStockDesc]').val(datas[0].deskripsi);
                        $(parentTR).find('textarea[id^=addStockCatatan]').val(datas[0].catatan);
                        $(parentTR).find('input[id^=addStockMerek], input[id^=addStockNama], input[id^=addStockJenis], textarea[id^=addStockDesc], textarea[id^=addStockCatatan]').attr('disabled',true).addClass('disabled');
                    }else{
                        $(parentTR).find('input[id^=addStockNama], input[id^=addStockMerek], input[id^=addStockJenis], input[id^=addStockHargabeli], input[id^=addStockHargajual], textarea[id^=addStockDesc], textarea[id^=addStockCatatan]').val('');
                        $(parentTR).find('input[id^=addStockMerek], input[id^=addStockNama], input[id^=addStockJenis], textarea[id^=addStockDesc], textarea[id^=addStockCatatan]').attr('disabled',false).removeClass('disabled');
                    }
                }
            });
        });

        $('input[id^=addStockHargabeli], input[id^=addStockHargajual]').each(function(){
          $(this).keyup(function(){
              var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
              $(this).val(Intl.NumberFormat('en-IND').format(number))
          });
        });
    }

    ifNewKode();
    $("#btnAddRow").click(function () {
        $.ajax({
            url: './sending-full-content',
            type: "GET",
            dataType: "json",
            success: function (datas) {

                var appendText = '' +
                    '<tr class="addedRow'+ numFieldTrx +'">' +
                    '<td data="'+ numFieldTrx +'" id="inputKodeBlock'+ numFieldTrx +'">' +
                    '<input class="inputListGroup autocompleteStock-'+ numFieldTrx +'" id="addStockKode-1" name="listStock['+ numFieldTrx +'][kode]" type="text" required></td>' +
                    '<td><input class="inputListGroup disabled" id="addStockMerek-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][merek]" type="text" disabled></td>' +
                    '<td><input class="inputListGroup disabled" id="addStockNama-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][nama]" type="text" disabled></td>' +
                    '<td><input class="inputListGroup disabled" id="addStockJenis-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][jenis]" type="text" disabled></td>' +
                    '<td><input class="inputListGroup" id="addStockHargabeli-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][hargabeli]" type="text" required></td>' +
                    '<td><input class="inputListGroup" id="addStockHargajual-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][hargajual]" type="text" required></td>' +
                    '<td><textarea class="materialize-textarea inputListGroup disabled" id="addStockDesc-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][deskripsi]" disabled></textarea></td>' +
                    '<td><input class="inputListGroup" id="addStockJumlah-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][jumlah]" type="number" required></td>' +
                    '<td><textarea class="materialize-textarea inputListGroup disabled" id="addStockCatatan-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][catatan]" disabled></textarea></td>' +
                    '<td class="center"><a class="btn-floating btn waves-effect waves-light red darken-3" name="btnRemRow-'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus Baris"><i class="material-icons">remove</i></a></td>' +
                    '</tr>' +
                    '';
                $("#addStockBlock").append(appendText);
                for (var keyDatas in datas) {
                    if (!datas.hasOwnProperty(keyDatas)) continue;
                    var resDatas = datas[keyDatas];
                    autocompleteData[resDatas.kode] = null;
                }
                $('input.autocompleteStock-'+ numFieldTrx).autocomplete({
                    data: autocompleteData

                });
                $("select").material_select();
                numFieldTrx++;

                $('[name^=btnRemRow]').click(function () {
                    var numToRem = $(this).attr('id');
                    var elm = ".addedRow"+ numToRem;

                    $(elm).remove();
                });
                ifNewKode();
            }
        });
    });
    //================ page add-stock end ==================
    //================ page add-code start ==================

    $("#btnAddRowCode").click(function () {
        $.ajax({
            url: './sending-code',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                var appendText = '' +
                    '<tr class="addedRow'+ numFieldTrx +'">' +
                    '<td data="'+ numFieldTrx +'" id="inputKodeBlock'+ numFieldTrx +'">' +
                    '<input class="inputListGroup" id="addStockKode-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][kode]" type="text" required>' +
                    '</select>' +
                    '</td>' +
                    '<td><input class="inputListGroup disabled" id="addStockMerek-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][merek]" type="text"></td>' +
                    '<td><input class="inputListGroup disabled" id="addStockNama-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][nama]" type="text"></td>' +
                    '<td><input class="inputListGroup disabled" id="addStockJenis-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][jenis]" type="text"></td>' +
                    '<td><textarea class="materialize-textarea inputListGroup disabled" id="addStockDesc-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][deskripsi]"></textarea></td>' +
                    '<td><textarea class="materialize-textarea inputListGroup disabled" id="addStockCatatan-'+ numFieldTrx +'" name="listStock['+ numFieldTrx +'][catatan]"></textarea></td>' +
                    '<td class="center"><a class="btn-floating btn waves-effect waves-light red darken-3" name="btnRemRow-'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus Baris"><i class="material-icons">remove</i></a></td>' +
                    '</tr>' +
                    '';
                $("#addStockBlock").append(appendText);
                numFieldTrx++;

                $('[name^=btnRemRow]').click(function () {
                    var numToRem = $(this).attr('id');
                    var elm = ".addedRow"+ numToRem;

                    $(elm).remove();
                });
                ifNewKode();
            }
        });
    });

    function trxPageFunc (){
        $('input[id^=trxKode]').change(function(){
            var value = $(this).val();
            var parentTr = $(this).closest('tr');
            $.ajax({
                url: './sending-content-by-name?name='+encodeURIComponent(value),
                type: "GET",
                dataType: "json",
                success: function (datas) {
                    if(datas.length != 0){
                        var kode = datas[0].kode;
                        var nama = datas[0].nama;
                        var merek = datas[0].merek;
                        var jenis = datas[0].jenis;
                        var deskripsi = datas[0].deskripsi;
                        var hargaJual = datas[0].hargajual || 0 ;
                        var jumlahStock = datas[0].jumlah;
                        var detailText = nama +" || "+ merek +" || "+ jenis +" \n"+ deskripsi +"";
                        $(parentTr).find('pre[id^=detailTrx]').text(detailText);
                        $(parentTr).find('span[id^=spanHarga]').text(Intl.NumberFormat('en-IND').format(parseInt(hargaJual)));
                        $(parentTr).find('span[id^=spanTotal]').text("0");
                        $(parentTr).find('input[id^=trxJumlah]').val("0");
                        //$(parentTr).find('span[id^=spanHarga]').text(hargaJual);

                        $(parentTr).find('input[id^=trxJumlah]').attr('disabled',false);
                        $(parentTr).find('input[id^=trxJumlah]').removeClass('disabled');
                        $(parentTr).closest('form').find('#trxSubmit').attr('disabled',false);
                        $(parentTr).closest('form').find('#trxSubmit').removeClass('disabled');
                    }else{
                        $(parentTr).find('pre[id^=detailTrx]').text("");
                        $(parentTr).find('span[id^=spanHarga]').text("");
                        $(parentTr).find('span[id^=spanTotal]').text("");
                        $(parentTr).find('input[id^=trxJumlah]').val("0");
                        $(parentTr).find('input[id^=trxJumlah]').attr('disabled',true);
                        $(parentTr).find('input[id^=trxJumlah]').addClass('disabled');
                        $(parentTr).closest('form').find('#trxSubmit').attr('disabled',true);
                        $(parentTr).closest('form').find('#trxSubmit').addClass('disabled');
                    }

                    $('input[id^=trxJumlah]').bind("keyup change", function(){
                        var parentTr = $(this).closest('tr');
                        var parentTable = $(this).closest('table');
                        var jumlah = ($(this).val() > 0)?parseInt($(this).val()) : 0;
                        console.log(jumlahStock);
                        if(jumlah > jumlahStock){
                            var alertString = "Jumlah stock tidak cukup.!!\nJumlah stock kode "+ kode +" = "+jumlahStock;
                            alert(alertString);
                            $(parentTr).find('input[id^=trxJumlah]').val(jumlahStock);
                            $(parentTr).find('input[id^=trxJumlah]').focusin();

                        }
                        var harga = parseInt($(parentTr).find('span[id^=spanHarga]').text().replace(/[^0-9]/gi, ''));
                        //var harga = $(parentTr).find('span[id^=spanHarga]').text();
                        $(parentTr).find('span[id^=spanTotal]').text((Intl.NumberFormat('en-IND').format(jumlah*harga)));

                        var sumTotal = 0;
                        var ongkos = parseInt($("#trxOngkos").val().replace(/[^0-9]/gi, '')) || 0;
                        var other = parseInt($("#trxLain").val().replace(/[^0-9]/gi, '')) || 0;
                        $(parentTable).find('span[id^=spanTotal]').each(function(){
                            sumTotal += (parseInt($(this).text().replace(/[^0-9]/gi, ''))) << 0;
                        });

                        $("#spanGrandTotal").text(Intl.NumberFormat('en-IND').format((sumTotal+ongkos+other)));
                    });
                }
            })
        });
    }

    trxPageFunc();
    if($('#trxSubmit').length > 0){
        $.ajax({
            url: './sending-full-content',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                for (var keyDatas in datas) {
                    if (!datas.hasOwnProperty(keyDatas)) continue;
                    var resDatas = datas[keyDatas];
                    autocompleteData[resDatas.kode] = null;
                }
                $('input.autocompleteTrx').autocomplete({
                    data: autocompleteData

                });
            }
        });
    }
    $("#btnAddRowTrx").click(function () {
        $.ajax({
            url: './sending-full-content',
            type: "GET",
            dataType: "json",
            success: function (datas) {
                var appendText = '' +
                    '<tr class="bordered addedRow'+ numFieldTrx +'">' +
                    '<td><input class="inputListGroup autocompleteTrx'+ numFieldTrx +'" id="trxKode-'+ numFieldTrx +'" name="listTrx['+ numFieldTrx +'][kode]" type="text"></td>' +
                    '<td><pre id="detailTrx'+ numFieldTrx +'" class="mt-0"></pre></td>' +
                    '<td><input class="center-align inputListGroup" id="trxJumlah-'+ numFieldTrx +'" name="listTrx['+ numFieldTrx +'][jumlah]" type="number" required></td>' +
                    '<td class="center-align"><span id="spanHarga'+ numFieldTrx +'"></span></td>' +
                    '<td class="right-align"><span id="spanTotal'+ numFieldTrx +'"> </span></td>' +
                    '<td class="center"><a class="btn-floating btn waves-effect waves-light red darken-3" name="btnRemRow-'+ numFieldTrx +'" id="'+ numFieldTrx +'" title="Hapus Baris"><i class="material-icons">remove</i></a></td>' +
                    '</tr>' +
                    '';
                $("#trxBlock").append(appendText);
                for (var keyDatas in datas) {
                    if (!datas.hasOwnProperty(keyDatas)) continue;
                    var resDatas = datas[keyDatas];
                    autocompleteData[resDatas.kode] = null;
                }
                $('input.autocompleteTrx'+ numFieldTrx +'').autocomplete({
                    data: autocompleteData

                });
                numFieldTrx++;

                $('[name^=btnRemRow]').click(function () {
                    var numToRem = $(this).attr('id');
                    var elm = ".addedRow"+ numToRem;

                    $(elm).remove();
                });
                trxPageFunc();
            }
        });
    });

    $('#trxOngkos, #trxLain').each(function(){
        $(this).bind("keyup change",function(){
            var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
            $(this).val(Intl.NumberFormat('en-IND').format(number));

            var sumTotal = 0;
            var ongkos = parseInt($("#trxOngkos").val().replace(/[^0-9]/gi, '')) || 0;
            var other = parseInt($("#trxLain").val().replace(/[^0-9]/gi, '')) || 0;
            $("#trxBlock").find('span[id^=spanTotal]').each(function(){
                sumTotal += (parseInt($(this).text().replace(/[^0-9]/gi, ''))) << 0;
            });

            $("#spanGrandTotal").text(Intl.NumberFormat('en-IND').format((sumTotal+ongkos+other)));
        });
    });
    //================ page add-code end ==================
    //================ page qry-edit start ==================
    $('input[id^=editQty]').change(function(){
        var currValue = parseInt($(this).attr("placeholder"));
        if(parseInt($(this).val()) == currValue ){
            var alertString = "Jumlah baru sama dengan jumlah stock saat ini..!!";
            alert(alertString);
            $(this).val('');
            $(this).focusin();
        }
    });
    //================ page qry-edit end ==================
    //================ page detail-edit start ==================
    $('input[id^=editHargaBeli], input[id^=editHargaJual]').each(function(){
        $(this).keyup(function(){
            var number = ($(this).val() != '' && $(this).val() != 'NaN') ? parseInt($(this).val().replace(/[^0-9]/gi, '')) : 0;
            $(this).val(Intl.NumberFormat('en-IND').format(number))
        });
    });

    $('input[id^=editKode]').change(function(){
        var value = $(this).val();
        var thisElem = $(this);
        $.ajax({
            url: './sending-content-by-name?name=' + encodeURIComponent(value),
            type: "GET",
            dataType: "json",
            success: function (datas) {
                if (datas.length != 0) {
                    var alertString = "Kode sudah ada..!!";
                    alert(alertString);
                    $(thisElem).val('');
                    $(thisElem).focus();

                }
            }
        });
    });
    //================ page detail-edit end ==================
});

