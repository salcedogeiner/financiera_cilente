'use strict';

/**
 * @ngdoc directive
 * @name financieraClienteApp.directive:conceptos/conceptosPorRubrosOp
 * @description
 * # conceptos/conceptosPorRubrosOp
 */
angular.module('financieraClienteApp')
  .directive('conceptosPorRubrosOp', function(financieraRequest, $timeout, $translate) {
    return {
      restrict: 'E',
      scope: {
        rubroidsobj: '=?', //objeto rubro que contine el saldo
        conceptos: '=?',
      },

      templateUrl: 'views/directives/conceptos/conceptos_por_rubros_op.html',
      controller: function($scope) {
        var self = this;
        self.mensajes_alerta_conceptos = null;
        //
        self.gridOptions_conceptos = {
          enableRowSelection: false,
          enableRowHeaderSelection: false,
          enableCellEditOnFocus: true,
          columnDefs: [{
              field: 'Id',
              visible: false,
              enableCellEdit: false
            },
            {
              field: 'Codigo',
              displayName: $translate.instant('CODIGO'),
              enableCellEdit: false,
              width: '10%',
              cellClass: 'input_center'
            },
            {
              field: 'Nombre',
              displayName: $translate.instant('NOMBRE'),
              enableCellEdit: false
            },
            {
              field: 'Descripcion',
              displayName: $translate.instant('DESCRIPCION'),
              enableCellEdit: false
            },
            {
              field: 'TipoConcepto.Nombre',
              displayName: $translate.instant('TIPO'),
              enableCellEdit: false,
              width: '10%',
            },
            {
              field: 'Rubro.Codigo',
              displayName: $translate.instant('RUBRO'),
              enableCellEdit: false,
              cellClass: 'input_center'
            },
            {
              field: 'FuenteFinanciamiento.Descripcion',
              displayName: $translate.instant('FUENTES_FINANCIACION'),
              enableCellEdit: false,
              width: '7%'
            },
            {
              field: 'Afectacion',
              displayName: $translate.instant('AFECTACION'),
              enableCellEdit: true,
              cellClass: 'input_right',
              type: 'number',
              cellFilter: 'currency',
              cellTemplate: '<div ng-init="row.entity.Afectacion=0">{{row.entity.Afectacion | currency:undefined:0}}</div>',
              width: '10%',
            }
          ]
        };
        self.gridOptions_conceptos.multiSelect = false;
        // refrescar
        self.refresh = function() {
          $scope.refresh = true;
          $timeout(function() {
            $scope.refresh = false;
          }, 0);
        };
        //
        self.consulta = function(rubroidsobj) {
          self.conceptosGridData = [];
          angular.forEach(rubroidsobj, function(i) {
            financieraRequest.get('concepto',
              $.param({
                query: "Rubro.Id:" + i.DisponibilidadApropiacion.Apropiacion.Rubro.Id,
                limit: 0
              })
            ).then(function(response) {
              if (response.data) {
                angular.forEach(response.data, function(datas) {
                  datas.FuenteFinanciamiento = i.DisponibilidadApropiacion.FuenteFinanciamiento;
                  self.conceptosGridData.push(datas);
                });
              }
            });
          });
          self.gridOptions_conceptos.data = self.conceptosGridData;
          $scope.gridHeight = self.gridOptions_conceptos.rowHeight * 6 + (self.gridOptions_conceptos.data.length * self.gridOptions_conceptos.rowHeight);
        }
        //operar concepto accion de boton
        self.operar_conceptos = function() {
          console.log("original")
          console.log($scope.rubroidsobj)

          $scope.conceptos = [];
          //self.mensajeCuentasContables = [];
          self.mensajes_alerta_conceptos = '';
          var nun_conceptos = 0;
          // Controla que el retorno de los conceptos sean los que se le asigno afectacion
          angular.forEach(self.gridOptions_conceptos.data, function(i) {
            if (i.Afectacion > 0 && i.Afectacion != undefined) {
              ++nun_conceptos;
              $scope.conceptos.push(i);
            }
          })
          // control que se afecte por lo menos un concepto
          if (nun_conceptos == 0) {
            swal("Error!", "Debe Afectar por lo menos un concepto ", "error")
          } else {
            //console.log("conceptos afectados")
            //console.log($scope.conceptos)

            $scope.suma_afectacion = {};
            // construir objeto rubro id con su total de afectacion
            angular.forEach($scope.conceptos, function(concepto) {
              if ($scope.suma_afectacion[concepto.Rubro.Id] == undefined) {
                $scope.suma_afectacion[concepto.Rubro.Id] = concepto.Afectacion
              } else {
                $scope.suma_afectacion[concepto.Rubro.Id] = $scope.suma_afectacion[concepto.Rubro.Id] + concepto.Afectacion
              }
            });
            // validar que la suma de las afectaciones por conceptos pertenecientes a cada rubro no sobrepase el valor del saldo
            angular.forEach($scope.suma_afectacion, function(value, key) {
              angular.forEach($scope.rubroidsobj, function(rubro) {
                if (rubro.DisponibilidadApropiacion.Apropiacion.Rubro.Id == key && value > rubro.Saldo) {
                  self.mensajes_alerta_conceptos = self.mensajes_alerta_conceptos + "<li> El Total de la afectación a los Conceptos pertenecientes al Rubro: " + rubro.DisponibilidadApropiacion.Apropiacion.Rubro.Codigo + "  supera el valor del saldo. <br> <b>Afectación:" + value + "<br>Saldo:" + rubro.Saldo + "</b></li>"
                }
              })
            })
            //valida que los conceptos tengan cuentas contables
            var mensajeCuentasContables = self.cuentasContablesPorConceptos($scope.conceptos);
            console.log(mensajeCuentasContables)
            angular.forEach(mensajeCuentasContables, function(mensaje){
              console.log(mensaje)
            })

          }
          // valida si hay errores y lanzamos la alerta
          if (self.mensajes_alerta_conceptos.length != 0) {
            $scope.conceptos = null;
            swal({
              title: 'Error!',
              html: '<ol align="left">' + self.mensajes_alerta_conceptos + '</ol>',
              type: 'error'
            })
          } else {
            angular.forEach($scope.rubroidsobj, function(objeto) { //objeto rubor
              var contenedor_conceptos = [];
              angular.forEach($scope.conceptos, function(concepto) { //conceptos afectantes
                if(concepto.FuenteFinanciamiento != null){  //con fuentes de finanaciacion
                  if (concepto.Rubro.Id == objeto.DisponibilidadApropiacion.Apropiacion.Rubro.Id && concepto.FuenteFinanciamiento.Id == objeto.DisponibilidadApropiacion.FuenteFinanciamiento.Id) {
                    contenedor_conceptos.push(concepto);
                  }
                }else{
                  if (concepto.Rubro.Id == objeto.DisponibilidadApropiacion.Apropiacion.Rubro.Id) {
                    contenedor_conceptos.push(concepto);
                  }
                }
              })
              objeto.DisponibilidadApropiacion.Concepto = contenedor_conceptos;
            })
          }
        }// fin operar concepto
        // consulta que los conceptos tengan cuenta contables
        self.cuentasContablesPorConceptos = function(conceptos_ids){
          var mensajes = [];
          angular.forEach(conceptos_ids, function(concepto){
            financieraRequest.get('concepto_cuenta_contable',
              $.param({
                query: "Concepto.Id:" + concepto.Id
              })
            ).then(function(response) {
              if (!response.data) {
                mensajes.push('<li> El Concepto ' + concepto.Codigo + ' No tiene Cuentas Contables Asociadas </li>')
              }
            });
          })
          return mensajes;
        }
        //
        $scope.$watch('rubroidsobj', function() {
          self.refresh();
          if ($scope.rubroidsobj != null) {
            self.consulta($scope.rubroidsobj);
          }
        })
        // fin
      },
      controllerAs: 'd_conceptosPorRubrosOp'
    };
  });
