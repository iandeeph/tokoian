var today = new Date();
var day = today.getDate();
day ='#tanggal' + day;
var numFieldTrx = 2;
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
                $('input.autocompleteStock').autocomplete({
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

