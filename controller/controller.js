/*
 *
 */
var pictureSource;
var destinationType; 
var montoUtilizado = 0;
var db;
var usuario;
var encontrados;
var eventos;
var app = {

    initialize: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.getElementById('logear').addEventListener('click', this.logear, false);        
        document.getElementById('scan').addEventListener('click', this.scan, false);
        document.getElementById('guardarLibro').addEventListener('click', this.guardarLibro, false);
        document.getElementById('solicitudesPorEnviar').addEventListener('click', this.obtenerSolicitudes, false);
        document.getElementById('solicitudesEnviadas').addEventListener('click', this.obtenerSolicitudesEnviadas, false);       
        document.getElementById('enviarSolicitud').addEventListener('click', this.confirmarEnvioSolicitud, false);
        //document.getElementById('eliminarSolicitudes').addEventListener('click', this.eliminarSolicitudes, false);
        document.getElementById('modificarLibro').addEventListener('click', this.modificarLibro, false);
        document.getElementById('eliminarLibro').addEventListener('click', this.eliminarLibro, false);

        
    },

    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },

    receivedEvent: function(id) {
        // var parentElement = document.getElementById(id);
        // var listeningElement = parentElement.querySelector('.listening');
        // var receivedElement = parentElement.querySelector('.received');

        // listeningElement.setAttribute('style', 'display:none;');
        // receivedElement.setAttribute('style', 'display:block;');

        console.log('Evento Recivido: ' + id);
    },

    scan: function() {
        if(window.usuario.evento.eventoActivo){
            var scanner = cordova.require("cordova/plugin/BarcodeScanner");
            scanner.scan(
                function (result) {
                    document.getElementById("precioReferencia").innerHTML = 0;
                    $('#formLibroNuevo')[0].reset();
                    if(result.text.toString().trim().length >=1){
                        app.buscarLibro(result.text);
                    }else{
                        $.mobile.changePage('#newSolicitudPag',{transition:"slide"});
                    }                
                }, 
                function (error) {
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Error al escanear el Libro: ' + error);
                    $('#popupDialog').popup().popup('open');
                }
            );
            // document.getElementById("precioReferencia").innerHTML = 0;
            // $('#formLibroNuevo')[0].reset();
            // app.buscarLibro(9789568410575);
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Usted no tiene evento asociado.');
            $('#popupDialog').popup().popup('open');
        }
        
    },

    logear: function(){
        console.log('logear');
        $('.divResumen').find('p').remove();
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        var form = $("#formLogin").serializeArray();
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLogin.asp',
            type: 'POST',
            dataType: 'json',
            data: {
                argUsuario: form[0].value.toLowerCase(),
                argClave: form[1].value
            },
            error : function (){
                document.title='error';
            }, 
            success: function (data) {
                if(data.success){
                    window.usuario = data.model;
                    var presupuestos = data.model.evento;
                    var pag = '#inicio';
                    $.mobile.changePage( pag, { transition: "slide"});
                    window.db = baseDatos.abrirBD();
                    window.db.transaction(
                        function(tx) {
                            // baseDatos.eliminarTablaPresupuesto(tx);
                            // baseDatos.eliminarTablaSolicitudesPorEnviar(tx);
                            baseDatos.tablaSolicitudesPorEnviar(tx);
                            baseDatos.tablaPresupuestos(tx);
                            baseDatos.verificarPresupuesto(tx, presupuestos, window.usuario.id);
                            baseDatos.obtenerPresupuestoId(tx, window.usuario);
                        }, baseDatos.errorTablaSolicitudes, baseDatos.successTablaSolicitudes );

                }else{
                    $.mobile.hidePageLoadingMsg();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Usted no se encuentra registrado.')
                    $('#popupDialog').popup().popup('open');
                }
            }
        });
    },

    formatValores: function(valor){
        var valorFormateado = '';
        var numero = valor.toString().replace(/\./g,'');
        while(numero.length > 3){
            valorFormateado = '.' + numero.substring(numero.length - 3) + valorFormateado;
            numero = numero.substring(0, numero.length - 3);
        }
        valorFormateado = numero + valorFormateado;
        return valorFormateado;
    },

    construirResumen: function(p){
        $('p').remove('.resumen');
        var $children = $('<p class="resumen"></p>');
        if(window.usuario.evento.eventoActivo){
            $children.html('<b>'+p.nombrePresupuesto+'</b><br />Evento Valido Hasta: '+p.fechaValidoHasta.toString()+' <br />Disponible: $'+app.formatValores(p.disponiblePresupuesto)+' / Utilizado: $'+app.formatValores(p.utilizado)+' ');
        }else{
            $children.html('<b>Usted no tiene evento disponible</b> ');
        }        
        $('.divResumen').append($children);
    },

    obtenerSolicitudes: function(){
        if(window.usuario.evento.eventoActivo){
            var pag = '#solicitudesPorEnviarPag';
            var idEvento = window.usuario.evento.id;
            window.db.transaction(function(tx) {
                baseDatos.obtenerSolicitudesPorEnviar(tx, window.usuario);
                baseDatos.obtenerPresupuestoId(tx, window.usuario);
            }, baseDatos.errorTablaSolicitudes, function(tx){
                //$.mobile.changePage(pag,{transition: "slide"});
            });
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Usted no tiene envento asociado.')
            $('#popupDialog').popup().popup('open');
        }
        
    },

    obtenerSolicitudesEnviadas: function(){
        $.mobile.showPageLoadingMsg( 'a', "Cargando...", false );
        var pag = '#solicitudesEnviadasPag'
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonSolicitudesEnviadas.asp',
            type: 'POST',
            dataType: 'json',
            data: {
                argUsuarioId: window.usuario.id
            },
            error : function (){
                document.title='error';
            }, 
            success: function (data) {
                if(data.success){
                    window.eventos = data.model;
                    var len = data.model.length;
                    var $ulLista = $('#listSolEnviadas');
                    $ulLista.find('li').remove('li');

                    if(len >= 1){
                        data.model.forEach(function(e){
                            var $elemento = $('<li></li>'); 
                            $elemento.html('<a href="" onClick="app.irEvento('+e.EventoId+') "id="evento-'+e.EventoId+'">'+e.Nombre+'</a>');
                            $ulLista.append($elemento).trigger('create');
                        });
                    }
                    if ($ulLista.hasClass('ui-listview')) {
                        $ulLista.listview('refresh');
                    } else {
                        $ulLista.trigger('create');
                    }
                    $.mobile.changePage(pag, {transition: "slide"});    
                }else{
                    $.mobile.hidePageLoadingMsg();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text(data.model.error);
                    $('#popupDialog').popup().popup('open');
                }
            }
        });
    },

    actualizaTotal: function(cantidad, idElemento, idTotal){
        var valor = $('#'+idElemento).val();
        var total = parseInt(valor)*parseInt(cantidad);
        total = app.formatValores(total);
        $('#'+idTotal).text(total!= 'NaN'?total:0);
    },

    irEvento: function(eId){
        window.eventos.forEach(function(e){
            if(eId == e.EventoId){
                $('#tablaSolPorEnviar').find('table').remove('table');
                var $tabla = $('<table></table>');
                $tabla.attr('data-role', 'table').attr('data-mode', 'reflow').attr('id','tablaResumenEvento');
                $tabla.find('tbody').remove('tbody');
                $tabla.find('thead').remove('thead');
                $('#tablaSolPorEnviar').find('#btnVerLibros').remove('#btnVerLibros');
                $tabla.append('<thead>').children('thead').append('<tr />').children('tr').append('<th>Evento:</th><th>Monto Total:</th><th>Fecha env&iacute;o:</th><th>Utilizado:</th>');
                $tabla.append('<tbody>').children('tbody').append('<tr />').children('tr').append('<td>'+e.Nombre+'</td><td>$ '+app.formatValores(e.totalPresupuesto)+'</td><td>'+e.FechaEnvioSolicitud.toString()+'</td><td>$ '+app.formatValores(e.PresupuestoUtilizado)+'</td>');
                var $center = $('<center></center>');
                var $btnVerLibros = $('<a></a>');
                $btnVerLibros.attr('data-role', 'button').attr('data-inline', 'true').attr('id', 'btnVerLibros').attr('data-icon', 'grid');
                $btnVerLibros.html('Ver Libros');
                $center.append($btnVerLibros);
                $btnVerLibros.attr('onClick', 'app.irVerLibros('+e.EventoId+')');
                $('#tablaSolPorEnviar').append($tabla).trigger('create');
                $('#tablaSolPorEnviar').append($center).trigger('create');
            }
        });
        $.mobile.changePage( '#detalleSolicitud', { transition: "slide"} ); 
    },

    irEditarLibro: function(idLibro){
        console.log(idLibro);
        window.db.transaction(function(tx) {
            baseDatos.obtenerLibroId(tx, idLibro);
        }, baseDatos.errorTablaSolicitudes, function(tx){
            app.actualizaTotal($('#cantidadE').val(), 'precioReferenciaE', 'totalPresupuestoE');
            $.mobile.changePage('#editarSolicitudPag',{transition: "slide"});
        } );

    },

    irVerLibros: function(idEvento){
        console.log(idEvento);
        $.mobile.showPageLoadingMsg( 'a', "Cargando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonSolicitudDetalle.asp',
            type: 'POST',
            dataType: 'json',
            data: {
               argUsuarioId: window.usuario.id,
               argEventoId: idEvento
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {                
                if(data.success){
                    var len = data.model.libros.length;
                    var $ulLista = $('#librosSolicitudesEnviadas');
                    $ulLista.find('li').remove('li');
                    if(len >= 1){
                        data.model.libros.forEach(function(libro){
                            var $elemento = $('<li></li>');
                            var chk = '<p class="lblNombreLibro">'+libro.Titulo+'</p><p class="lblAutor">Autor: '+libro.Autor+'</p><p class="lblPrecio">Precio: $'+app.formatValores(libro.Precio)+'</p><p class="lblCantidad">Cantidad: '+libro.Cantidad+'</p>';
                            $elemento.html(chk);
                            $ulLista.append($elemento).trigger('create');
                        });                        
                    }
                    if ($ulLista.hasClass('ui-listview')) {
                        $ulLista.listview('refresh');
                    } else {
                        $ulLista.trigger('create');
                    }
                    $.mobile.changePage('#librosEnviadosPag',{transition: "slide"});
                }else{
                    $.mobile.hidePageLoadingMsg();
                }
            }
        });
    },

    buscarNotScann:function(){
        var isbn = $('#isbn').val();
        console.log(isbn);
        $.mobile.showPageLoadingMsg( "a", "Buscando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLibro.asp',
            type: 'POST',
            dataType: 'json',
            data: {
               argISBN: isbn
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {
                if(isbn.toString().length != 0){
                    if(data.success){
                        var a = data.model;
                        app.actualizaTotal(0, 'precioReferencia', 'totalPresupuesto');
                        $.mobile.hidePageLoadingMsg();
                        $('#isbn').val(a.isbn);
                        $('#titulo').val(a.titulo);
                        $('#autor').val(a.autor);
                        $('#precioReferencia').val('');
                        $('#cantidad').val('');                       
                        $('#totalPresupuesto').text('0');
                    }else{
                        $('#titulo').val('');
                        $('#autor').val('');
                        $('#precioReferencia').val('');
                        $('#cantidad').val('');                       
                        $('#totalPresupuesto').text('0');
                        $.mobile.hidePageLoadingMsg();
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.error+'\nPor favor ingreselo manualmente.');
                        $('#popupDialog').popup().popup('open');
                    }
                }                
            }
        });
    },

    buscarLibro: function(codigoIsbn){
        $.mobile.showPageLoadingMsg( "a", "Buscando...", false );
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonLibro.asp',
            type: 'POST',
            dataType: 'json',
            data: {
               argISBN: codigoIsbn
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {
                if(isbn.toString().length != 0){
                    if(data.success){
                        var a = data.model;
                        app.actualizaTotal(0, 'precioReferencia', 'totalPresupuesto');
                        $('#isbn').val(a.isbn);
                        $('#titulo').val(a.titulo);
                        $('#autor').val(a.autor);

                    }else{
                        $.mobile.hidePageLoadingMsg();
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.error+'\nPor favor ingreselo manualmente.');
                        $('#popupDialog').popup().popup('open');
                        $('#isbn').val(codigoIsbn);
                    }
                    $.mobile.changePage( '#newSolicitudPag', { transition: "slide"} );
                }                
            }
        });
    },

    guardarLibro: function(){
        console.log('guardarLibro idEvento: '+window.usuario.evento.id);
        var guardar = false;
        if(document.getElementById("isbn").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo ISBN.');
            $('#popupDialog').popup().popup('open');
        }else if(document.getElementById("titulo").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Titulo.');
            $('#popupDialog').popup().popup('open');
        }else if(document.getElementById("autor").value.trim().length <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Autor.');
            $('#popupDialog').popup().popup('open');
        }else if(parseInt(document.getElementById("precioReferencia").value) <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Valor.');
            $('#popupDialog').popup().popup('open');
        }else if(parseInt(document.getElementById("cantidad").value) <= 0){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe completar el campo Cantidad.');
            $('#popupDialog').popup().popup('open');
        }else{
            guardar = true;
        }
        if(guardar){
            var libro = {
                isbn: document.getElementById("isbn").value,
                nombre_libro: document.getElementById("titulo").value,
                valor_referencia: document.getElementById("precioReferencia").value,
                cantidad: document.getElementById("cantidad").value,
                autor: document.getElementById("autor").value
            };
            window.db.transaction(function(tx) {
                baseDatos.verificarLibro(tx,libro, window.usuario);
            }, baseDatos.errorGuardarLibro, baseDatos.successGuardarLibro);
        }
    },

    eliminarSolicitudes: function(){
        var largoArray = $('#listadoSolicitudesPorEnviar').find('li').find('input:checked').length;
        var librosEliminar = new Array(largoArray);
        var i = 0;
        $('#listadoSolicitudesPorEnviar').find('li').find('input:checked').each(function(e, b){
            librosEliminar[i] = b.id.split('-')[1];
            i++;
        });
        if(librosEliminar.length >= 1){
            window.db.transaction(function(tx){
               baseDatos.borrarLibro(tx, librosEliminar, window.usuario);
            }, baseDatos.errorBuscarLibroEnvio, function(){
                window.db.transaction(function(tx) {
                    baseDatos.updatePresupuestoFinal(tx, window.usuario);
                }, function(tx){
                    console.log('error al update del presupuesto');
                }, function(tx){
                    console.log('presupuesto actualizado');
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Libro eliminado con exito.');
                    $('#popupDialog').popup().popup('open');
                    var pag = '#inicio';
                    $.mobile.changePage( pag, { transition: "slide"});
                });                
            });
        }else{
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe seleccionar al menos un libro para eliminar.');
            $('#popupDialog').popup().popup('open');
        }
        
    },

    eliminarLibro: function(isbn){
        var isbn = $('#isbnE:input').val();
        window.db.transaction(function(tx) {
            baseDatos.eliminarLibro(tx, isbn, window.usuario);
        }, baseDatos.errorUpdateLibro, function(tx){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El libro ha sido eliminado con exito.');
            $('#popupDialog').popup().popup('open');
            window.db.transaction(function(tx) {
                baseDatos.updatePresupuestoFinal(tx, window.usuario);
            }, function(tx){
                console.log('error al update del presupuesto');
            }, function(tx){
                console.log('presupuesto actualizado');
            });
            window.app.obtenerSolicitudes();
        });        
    },
    confirmarEnvioSolicitud: function(){
        $('#confirm-dialog').find('h1').text('Advertencia');
        $('#confirm-dialog').find('h3').text('El libro ha sido eliminado con exito.');
        $('#confirm-dialog').popup().popup('open'); 
    },

    enviarSolicitud: function(){
        
        window.db.transaction(function(tx) {
            tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+window.usuario.id+' and idPresupuesto='+window.usuario.evento.id, [], function(tx, results){

                var len = results.rows.length;
                var libros = new Array(len);
                for (var i=0; i<len; i++){
                    var r = results.rows.item(i);
                    console.log(r);
                    var libro = {
                        codigoISBN: r.isbn,
                        Titulo: r.nombre_libro,
                        Autor: r.autor,
                        Cantidad: r.cantidad,
                        Precio: r.valor_referencia
                    };
                    libros[i] = libro;
                }
                app.enviarDibam(libros);

            }, function(tx){
                console.log("error");
            });
        }, function(tx){
            //error
        }, function(tx){
            //exito
        });
        
    },

    enviarDibam: function(sol){
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        var solicitud = {
            model: {
                eventoId: window.usuario.evento.id,
                usuarioId: window.usuario.id,
                libros: sol
            }
        };
        $.ajax({
            url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonRecibeSolicitud.asp',
            type: 'POST',
            dataType: 'json',
            data: {
               argJSON: JSON.stringify(solicitud)
            },
            error : function (){ document.title='error'; }, 
            success: function (data) {                
                if(data.success){
                    window.usuario.evento.eventoActivo = false;
                    app.sincronizaPresupuesto();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text('Su solicitud fue enviada con exito.');
                    $('#popupDialog').popup().popup('open');
                    $.mobile.changePage( '#inicio', {transition: "slide"});
                }else{
                    $.mobile.hidePageLoadingMsg();
                    $('#popupDialog').find('h1').text('Advertencia');
                    $('#popupDialog').find('h3').text(data.model.error);
                    $('#popupDialog').popup().popup('open');
                    $.mobile.changePage( '#inicio', {transition: "slide"});
                }
            }
        });
        // window.db.transaction(function(tx) {
        //     baseDatos.borrarLibro(tx, window.usuario);
        // }, baseDatos.errorTablaSolicitudes, function(tx){
        //     alert('Su solicitud ha sido enviada con exito.');
        //     $.mobile.changePage( '#inicio', {transition: "slide"});
        // } );
    },

    modificarLibro: function(){
        console.log('Modificando libro');
        var libro = {
            idLibro : $('#idLibro:input').val(),
            isbn: $('#isbnE:input').val(),
            titulo: $('#tituloE:input').val(),
            autor: $('#autorE:input').val(),
            valor: $('#precioReferenciaE:input').val(),
            cantidad: $('#cantidadE:input').val()
        };

        window.db.transaction(function(tx) {
            baseDatos.updateLibro(tx, libro);
        }, baseDatos.errorUpdateLibro, function(tx){
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('El libro ha sido modificado con exito.');
            $('#popupDialog').popup().popup('open');
            window.db.transaction(function(tx) {
                baseDatos.updatePresupuestoFinal(tx, window.usuario);
            }, function(tx){
                console.log('error al update del presupuesto');
            }, function(tx){
                console.log('presupuesto actualizado');
            });
            window.app.obtenerSolicitudes();
        });
    },

    actualizaPresupuesto: function(valorTotal){
        console.log(valorTotal);
        window.db.transaction(function(tx) {
            baseDatos.updatePresupuesto(tx, valorTotal, window.usuario);
        }, function(tx){
            console.log('error al update del presupuesto');
        }, function(tx){
            console.log('presupuesto actualizado');
            app.sincronizaPresupuesto();            
        });
    },

    sincronizaPresupuesto: function(){
        window.db.transaction(function(tx) {
            baseDatos.verificarPresupuesto(tx, window.usuario.evento, window.usuario.id);
        }, function(tx){
            console.log('error sincronizaPresupuesto');
        }, function(tx){
            console.log('success sincronizaPresupuesto');            
        });
    },

    contactenos: function(){
        $.mobile.showPageLoadingMsg( "a", "Cargando...", false );
        if($('#mensajeContacto').val().trim().length >= 1){
            $.ajax({
                url: 'http://dibam-sel.opensoft.cl/OpenSEL/json/jsonContactenos.asp',
                type: 'POST',
                dataType: 'json',
                data: {
                   argUsuarioId: window.usuario.id,
                   argMensaje: $('#mensajeContacto').val()
                },
                error : function (){ document.title='error'; }, 
                success: function (data) {                
                    if(data.success){
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.mensaje);
                        $('#popupDialog').popup().popup('open');
                        $.mobile.changePage( '#inicio', {transition: "slide"});
                    }else{
                        $.mobile.hidePageLoadingMsg();
                        $('#popupDialog').find('h1').text('Advertencia');
                        $('#popupDialog').find('h3').text(data.model.mensaje);
                        $('#popupDialog').popup().popup('open');
                        $.mobile.changePage( '#inicio', {transition: "slide"});
                    }
                }
            });
        }else{
            $.mobile.hidePageLoadingMsg();
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('Debe llenar el campo para poder enviar.');
            $('#popupDialog').popup().popup('open');
        }
    }
};

