var baseDatos = {

	//Conectarse a la base de datos o crear una nueva
    abrirBD: function(){
        var db = openDatabase('dibam', '1.0', 'Dibam', 100 * 1024);
        return db;
    },
	//Creacion de Tablas
    tablaSolicitudesPorEnviar:function(tx){
        tx.executeSql('create table if not exists Solicitudes_por_enviar (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, isbn, nombre_libro, valor_referencia, cantidad, autor, idPresupuesto, idUsuario )');
        console.log('tabla Solicitudes_por_enviar creada');
    },
    tablaPresupuestos:function(tx){
        //tx.executeSql('create table if not exists Presupuestos (id unique, nombre, total, disponible, utilizado,fechaValido)');
        tx.executeSql('create table if not exists Presupuestos (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, idPresupuesto, nombrePresupuesto, totalPresupuesto, disponiblePresupuesto, utilizado, fechaValidoHasta, idUsuario, eventoActivo)');
        console.log('tabla presupuesto creada');
    },

    tablaUsuario: function(){
        //id INTEGER PRIMARY KEY
        tx.executeSql('create table if not exists Usuario (id unique, nombre, nombreBiblioteca, idPresupuesto)');
        console.log('tabla Usuario creada');
    },

    //inserts
	agregarSolicitud: function(tx, libro, idPresupuesto){
		var valor_referencia = libro.valor_referencia.replace('.','').replace(',','');
        window.montoUtilizado = window.montoUtilizado + (valor_referencia*1);
        // var idPresupuesto = 1;
        //var idPresupuesto = window.usuario.evento.id;
        console.log('Valor: '+(valor_referencia*1)*libro.cantidad);
        var utilizado = (valor_referencia*1)*libro.cantidad;
        tx.executeSql('insert into Solicitudes_por_enviar (isbn, nombre_libro, valor_referencia, cantidad, autor, idPresupuesto, idUsuario) values ('+libro.isbn+', "'+libro.nombre_libro+'", '+valor_referencia+', '+libro.cantidad+', "'+libro.autor+'", '+idPresupuesto+','+window.usuario.id+')');
        tx.executeSql('update Presupuestos set utilizado = (select utilizado from Presupuestos where idPresupuesto='+idPresupuesto+' and idUsuario='+window.usuario.id+')+'+utilizado+', disponiblePresupuesto = (select disponiblePresupuesto from Presupuestos where idPresupuesto='+idPresupuesto+' and idUsuario='+window.usuario.id+')-'+utilizado+' WHERE idPresupuesto = '+idPresupuesto+' and idUsuario='+window.usuario.id);
        baseDatos.obtenerPresupuestoId(tx, window.usuario);
    },

    agregarPresupuesto: function(tx, presupuesto, idUsuario){
    	console.log(presupuesto);
        tx.executeSql('insert into Presupuestos (idPresupuesto, nombrePresupuesto, totalPresupuesto, disponiblePresupuesto, utilizado,fechaValidoHasta, idUsuario, eventoActivo) VALUES ('+presupuesto.id+',"'+presupuesto.nombrePresupuesto+'",'+presupuesto.totalPresupuesto+','+presupuesto.disponiblePresupuesto+','+presupuesto.utilizado+',"'+presupuesto.fechaValidoHasta+'",'+idUsuario+', "'+presupuesto.eventoActivo+'")');
    },

    //Updates
    updateLibro: function(tx, libro){
       tx.executeSql('update Solicitudes_por_enviar set isbn='+libro.isbn+',  nombre_libro="'+libro.titulo.toString()+'", valor_referencia='+parseInt(libro.valor)+', cantidad='+parseInt(libro.cantidad)+', autor ="'+libro.autor.toString()+'" WHERE id = '+parseInt(libro.idLibro)+';');
    },

    updatePresupuesto: function(tx, valor, usuario){
        tx.executeSql('update Presupuestos set utilizado ='+valor+', disponiblePresupuesto= '+(usuario.evento.totalPresupuesto-valor)+' WHERE idPresupuesto = '+usuario.evento.id+' and idUsuario= '+usuario.id+';', [], baseDatos.succesUpdateDisponible, baseDatos.errorTransaccion);
    },

    updatePresupuestoFinal: function(tx, usuario) {
        tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+usuario.id+' and idPresupuesto='+usuario.evento.id, [], function(tx, results){
            var valorTotal = 0;
            if(results.rows.length >= 1){
                var len = results.rows.length;                
                for (var i=0; i<len; i++){
                    var r = results.rows.item(i);
                    valorTotal = valorTotal+(r.valor_referencia*r.cantidad);
                    //app.construirResumen(r);
                }
            }
            app.actualizaPresupuesto(valorTotal);
        }, baseDatos.errorGuardar);
    },
    //Consultas
    verificarLibro: function(tx, libro, usuario){
    	tx.executeSql('select * from Solicitudes_por_enviar where isbn='+libro.isbn+' and idUsuario='+usuario.id, [], function(tx, results){
    		if(results.rows.length == 0){
    			console.log('agregado');   			
    			baseDatos.agregarSolicitud(tx, libro, usuario.evento.id);
    		}else{
                $('#popupDialog').find('h1').text('Advertencia');
                $('#popupDialog').find('h3').text('El libro ya se encuentra agregado');
                $('#popupDialog').popup().popup('open');
    			//alert('El libro ya se encuentra agregado');
    		}
    	}, baseDatos.errorGuardar);
    },

    verificarPresupuesto: function(tx, presupuesto, idUsuario){
        tx.executeSql('select * from Presupuestos where idPresupuesto='+presupuesto.id+' and idUsuario='+idUsuario, [], function(tx, results){
            if(results.rows.length == 0){
                console.log('agregado');            
                baseDatos.agregarPresupuesto(tx, presupuesto, idUsuario);
                app.construirResumen(presupuesto);
            }else{
                var len = results.rows.length;
                console.log('ya existe');
                for (var i=0; i<len; i++){
                    var r = results.rows.item(i);
                    if(window.usuario.evento.eventoActivo != $.parseJSON(r.eventoActivo)){
                        baseDatos.activarDesactivarEvento(tx, window.usuario.evento.eventoActivo);
                        //r.eventoActivo = window.usuario.evento.eventoActivo.toString();
                    }
                    app.construirResumen(r);
                }                
                //alert('el libro ya se encuentra agregado');
            }
        }, baseDatos.errorGuardar);
    },

    activarDesactivarEvento: function(tx, isActivado){
        tx.executeSql('update Presupuestos set eventoActivo ="'+isActivado+'" WHERE idPresupuesto = '+window.usuario.evento.id+' and idUsuario= '+window.usuario.id+';');
    },

    // obtenerPresupuesto: function(tx){
    // 	tx.executeSql('select * from Presupuestos', [], baseDatos.successPresupuestos, app.errorCB);
    // },

    obtenerPresupuestoId: function(tx, usuario){
        tx.executeSql('select * from Presupuestos where idUsuario= '+usuario.id+' and idPresupuesto='+usuario.evento.id, [], baseDatos.successPresupuestos, baseDatos.errorObteniendoPresupuesto);
    },

    // obtenerSolicitudesPorEnviar: function(tx, idPresupuesto) {
    //     tx.executeSql('select * from Solicitudes_por_enviar where idPresupuesto='+idPresupuesto, [], baseDatos.successSolicitudesPorEnviar, baseDatos.errorCB);
    // },

    obtenerSolicitudesPorEnviar: function(tx, usuario) {
        tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+usuario.id+' and idPresupuesto='+usuario.evento.id, [], baseDatos.successSolicitudesPorEnviar, baseDatos.errorCB);
    },

    obtenerLibroSolicitudesPorEnviar: function(tx, libros, usuario) {
        tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+usuario.id, [], baseDatos.successBuscarLibroEnvio, baseDatos.errorCB);
        // tx.executeSql('select * from Solicitudes_por_enviar where idUsuario='+usuario.id, [], function(tx, results){
        //     var len = results.rows.length;
        //     var encontrados = new Array(len);
        //     if(len >= 1){
        //         for (var x=0; x<len; x++){
        //             encontrados[x] = results.rows.item(x);
        //         }
        //     }
        //     app.librosEncontrados(encontrados);
        // }, baseDatos.errorCB);
        // tx.executeSql('select * from Solicitudes_por_enviar where isbn='+isbn+' and idUsuario='+usuario.id, [], baseDatos.successLibroSolicitudesPorEnviar, baseDatos.errorCB);
        
    },

    obtenerLibroId: function(tx, idLibro){
        tx.executeSql('select * from Solicitudes_por_enviar where id='+idLibro, [], baseDatos.successObtenerLibroId, baseDatos.errorObtenerLibroId);
    },

    // obtenerLibroSolicitudesPorEnviar: function(tx, libros, usuario) {
    //     for(var i= 0; i< libros.length; i++){
    //         tx.executeSql('select * from Solicitudes_por_enviar where isbn='+libros[i].codigoISBN+' and idUsuario='+usuario.id, [], function(tx, results){
    //             var len = results.rows.length;
    //             if(len >= 1){
    //                 for (var x=0; x<len; x++){
    //                     var r = results.rows.item(x);
    //                     console.log(r);
    //                     libros[i].Titulo= r.nombre_libro;
    //                     libros[i].Autor = r.cantidad;
    //                     libros[i].Cantidad= r.cantidad;
    //                     libros[i].Precio = r.valor_referencia;
    //                 }
    //             }

    //         }, baseDatos.errorCB);
    //     } 
    //     console.log(libros);
    //     // tx.executeSql('select * from Solicitudes_por_enviar where isbn='+isbn+' and idUsuario='+usuario.id, [], baseDatos.successLibroSolicitudesPorEnviar, baseDatos.errorCB);
        
    // },

	borrarLibro: function(tx, librosEliminar, usuario) {
        var sqlQuery;
        librosEliminar.forEach(function(a){
            //sqlQuery = sqlQuery+' delete from Solicitudes_por_enviar where idUsuario='+usuario.id+' and isbn='+a+'; ';
            tx.executeSql('delete from Solicitudes_por_enviar where idUsuario='+usuario.id+' and isbn='+a, [], baseDatos.successBorrarLibro, baseDatos.errorBorrarLibro);
        });
    },

    eliminarLibro: function(tx, isbn, usuario) {
        // var sqlQuery;
        // librosEliminar.forEach(function(a){
            //sqlQuery = sqlQuery+' delete from Solicitudes_por_enviar where idUsuario='+usuario.id+' and isbn='+a+'; ';
            tx.executeSql('delete from Solicitudes_por_enviar where idUsuario='+usuario.id+' and isbn='+isbn, [], baseDatos.successBorrarLibro, baseDatos.errorBorrarLibro);
        // });
    },
    eliminarTablaPresupuesto: function(tx){
        tx.executeSql('drop table Presupuestos',[],baseDatos.successPresupuestos, baseDatos.errorTablaSolicitudes);
    },
    eliminarTablaSolicitudesPorEnviar: function(tx){
        tx.executeSql('drop table Solicitudes_por_enviar',[],baseDatos.succesDeleteSolicitudes, baseDatos.errorTablaSolicitudes);
    },

    successLibroSolicitudesPorEnviar: function(tx, results){
        var len = results.rows.length;
        if(len >= 1){
            for (var i=0; i<len; i++){
                var r = results.rows.item(i);
                console.log(r);
          //       window.montoUtilizado =window.montoUtilizado+(r.valor_referencia*r.cantidad);
          //       window.montoUtilizado = app.formatValores(window.montoUtilizado);
          //       // largoCadena = r.valor_referencia.toString().length;
          // //       if(largoCadena > 3){
          // //           sobrante = largoCadena-3;
          // //           valorDeReferencia = r.valor_referencia.toString().substring(0,sobrante)+'.'+r.valor_referencia.toString().substring(largoCadena-3,largoCadena);
          // //       }else{
          // //           valorDeReferencia = r.valor_referencia.toString();
          // //       }
          //       valorDeReferencia = app.formatValores(r.valor_referencia);
          //       //sobrante = largoCadena-3;
          //       //valorDeReferencia = r.valor_referencia.toString().substring(0,sobrante)+'.'+r.valor_referencia.toString().substring(largoCadena-3,largoCadena);

          //       if($('#checkbox-'+r.isbn).length < 1){
          //           var $elemento = $('<li></li>');
          //           var chk = '<input type="checkbox" name="checkbox-'+r.isbn+'" id="checkbox-'+r.isbn+'" class="custom"/> <label for="checkbox-'+r.isbn+'"><p class="label-sol">'+r.nombre_libro+'</p><p class="label-precio">Precio: $'+valorDeReferencia+'</p><p class="label-cantidad">Cantidad: '+r.cantidad +'</p></label>';
          //           $elemento.html(chk);
          //           // var chk = '<input type="checkbox" name="checkbox-'+r.isbn+'" id="checkbox-'+r.isbn+'" class="custom"/> <label for="checkbox-'+r.isbn+'"><p class="label-sol"><img src="style/img/icons/solEnviadas.png" style="float:left;">'+r.nombre_libro+'<br/>Precio: $'+valorDeReferencia+'<br>Cantidad: '+r.cantidad +'<br /></p></label>';
          //           ulLista.appendChild($elemento[0]);
          //       }
            }
            // if ($('#listadoSolicitudesPorEnviar').hasClass('ui-listview')) {
            //     $('#listadoSolicitudesPorEnviar').listview('refresh');
            // } else {
            //     $('#listadoSolicitudesPorEnviar').trigger('create');
            // }
        }
        // else{
        //     //document.getElementById("sinResultadoSolicitud").innerHTML = 'Usted no tiene solicitudes por enviar.';            
        //     console.log('no tiene solicitudes por enviar');
        // }
    },

    //Resultados
    successSolicitudesPorEnviar: function(tx, results){
    	var len = results.rows.length;
        var sobrante,largoCadena, valorDeReferencia;
        var $ulLista = $('#listadoSolicitudesPorEnviar');
        $ulLista.find('li').remove('li');
        console.log("Tabla SolicitiudesPorEnviar: " + len + " filas encontradas.");
        if(len >= 1){
		    for (var i=0; i<len; i++){
		    	var r = results.rows.item(i);
		    	window.montoUtilizado =window.montoUtilizado+(r.valor_referencia*r.cantidad);
                window.montoUtilizado = app.formatValores(window.montoUtilizado);
                valorDeReferencia = app.formatValores(r.valor_referencia);		        
                var $elemento = $('<li></li>');
                var chk = '<a href="#" style="padding-top: 0px;padding-bottom: 0px;padding-right: 42px;padding-left: 0px;"><label style="border-top-width: 0px;margin-top: 0px;border-bottom-width: 0px;margin-bottom: 0px;border-left-width: 0px;border-right-width: 0px;" data-corners="false"><fieldset data-role="controlgroup" ><label style="border-top-width: 0px;margin-top: 0px;border-bottom-width: 0px;margin-bottom: 0px;border-left-width: 0px;border-right-width: 0px;"><label><p class="label-sol">'+r.nombre_libro+'</p><p class="label-precio">Precio: $'+valorDeReferencia+'</p><p class="label-cantidad">Cantidad: '+r.cantidad +'</p></label></label></fieldset></label></a><a href="#" onClick="app.irEditarLibro('+r.id+')" ></a>';
                $elemento.html(chk);

                $ulLista.append($elemento).trigger('create');
		    }
            if ($ulLista.hasClass('ui-listview')) {
                $ulLista.listview('refresh');
            } else {
                $ulLista.trigger('create');
            }
            //eliminar linea cuando se arregle el flujo
            $.mobile.changePage( '#solicitudesPorEnviarPag', { transition: "slide"} );
		}else{
			//document.getElementById("sinResultadoSolicitud").innerHTML = 'Usted no tiene solicitudes por enviar.';			
			console.log('no tiene solicitudes por enviar');
            $.mobile.changePage( '#inicio', { transition: "slide"} );
            $('#popupDialog').find('h1').text('Advertencia');
            $('#popupDialog').find('h3').text('No tienes Libros por enviar');
            $('#popupDialog').popup().popup('open');           
            //alert('No tienes Libros por enviar');
		}
    },

    succesUpdateDisponible: function(tx){
        console.log('tabla presupuesto actualizada creada');
    },

    successBorrarLibro: function(tx){
        console.log('libro borrado');
    },

    succesDeletePresupuesto: function(tx){
        console.log('tabla presupuesto eliminada');
    },
    succesDeleteSolicitudes: function(tx){
        console.log('tabla solicitudes eliminada');
    },

    succesaaa: function(tx){
        console.log('tabla solicitudes');
    },

    successPresupuestos: function(tx, results){
    	var len = results.rows.length;
        console.log("Tabla Presupuestos: " + len + " filas encontradas.");
        if(len >= 1){
		    for (var i=0; i<len; i++){
		        var r = results.rows.item(i);
                app.construirResumen(r);      
		    }
		}else{
			console.log('no tiene presupuestos asociados');
		}
    },

    successTablaSolicitudes: function(){
    	console.log('tabla solicitudes creada');
    },
    successGuardarLibro: function(){
    	console.log('Libro Creado Exitosamente');
        //app.construirResumen(idEvento);
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Libro guardado exitosamente.');
        $('#popupDialog').popup().popup('open');   
        //alert('Libro guardado exitosamente.');
        $.mobile.changePage( '#inicio',{transition: "slide"});
    },

    successBuscarLibroEnvio: function(tx, results){
        //var len = results.rows.length;
        var len = results.rows.length;
        window.encontrados = new Array(len);
        for (var i=0; i<len; i++){
            console.log(results.rows.item(i));
            window.encontrados[i] = results.rows.item(i);
        }
        console.log("Tabla Solicitudes por enviar: Libros encontrados.");
        console.log('Libro Encontrado Exitosamente');
    },
    successObtenerLibroId: function(tx, results){
        var len = results.rows.length;
        window.encontrados = new Array(len);
        if(len >= 1){
            for (var i=0; i<len; i++){
                console.log(results.rows.item(i));
                var libro = results.rows.item(i)
                $('#isbnE:input').val(libro.isbn);
                $('#tituloE:input').val(libro.nombre_libro);
                $('#autorE:input').val(libro.autor);
                $('#precioReferenciaE:input').val(libro.valor_referencia);
                $('#cantidadE:input').val(libro.cantidad);
                $('#idLibro:input').val(libro.id);                
            }
        }
    },

    //Errores de transaccion
    errorTablaSolicitudes: function(tx){
    	console.log("Error creando tabla solicitudes Codigo: "+tx.code);
        console.log("Error creando tabla solicitudess SQL: "+tx.message);
    },

    errorGuardarLibro: function(tx) {
        console.log("Error guardando libro SQL Codigo: "+tx.code);
        console.log("Error guardando libro SQL: "+tx.message);
    },
    errorTransaccion: function(tx){
        console.log("Error creando tabla solicitudes Codigo: "+tx.code);
        console.log("Error creando tabla solicitudess SQL: "+tx.message);
    },
    errorBuscarLibroEnvio: function(tx){
        console.log("Error buscando Libros para envio Solicitud Codigo: "+tx.code);
        console.log("Error buscando Libros para envio Solicitud SQL: "+tx.message);
    },
    // Función 'callback' de error de transacción
    errorCB: function(tx) {
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Error procesando SQL: '+tx.message);
        $('#popupDialog').popup().popup('open');  
        //alert("Error procesando SQL: "+tx.message);
        console.log("Error procesando SQL Codigo: "+tx.code);
        console.log("Error procesando SQL: "+tx.message);
    },
    errorObteniendoPresupuesto: function(tx) {
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Error procesando SQL: '+tx.message);
        $('#popupDialog').popup().popup('open');  
        //alert("Error procesando SQL: "+tx.message);
        console.log("Error procesando SQL Codigo: "+tx.code);
        console.log("Error procesando SQL: "+tx.message);
    },

    errorBorrarLibro: function(tx) {
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Error procesando SQL: '+tx.message);
        $('#popupDialog').popup().popup('open');  
        //alert("Error procesando SQL: "+tx.message);
        console.log("Error procesando SQL Codigo: "+tx.code);
        console.log("Error procesando SQL: "+tx.message);
    },

    errorObtenerLibroId: function(tx) {
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Error procesando SQL: '+tx.message);
        $('#popupDialog').popup().popup('open');  
        //alert("Error procesando SQL: "+tx.message);
        console.log("Error procesando SQL Codigo: "+tx.code);
        console.log("Error procesando SQL: "+tx.message);
    },

    errorUpdateLibro: function(tx){
        $('#popupDialog').find('h1').text('Advertencia');
        $('#popupDialog').find('h3').text('Error procesando SQL: '+tx.message);
        $('#popupDialog').popup().popup('open');  
        //alert("Error procesando SQL: "+tx.message);
        console.log("Error procesando SQL Codigo: "+tx.code);
        console.log("Error procesando SQL: "+tx.message); 
    }

}