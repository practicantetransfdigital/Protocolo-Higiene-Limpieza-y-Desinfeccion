// ==================== CONFIGURACIÓN ====================
const SPREADSHEET_ID = '1nR7gF7TNYtdb0Eq3ffB62pEBT7vT25CCsys9xzPrx0U'; 

// Nombres de las hojas
const SHEETS = {
  USUARIOS: 'USUARIOS',
  MAQUINAS: 'MAQUINAS',
  ELEMENTOS: 'ELEMENTOS',
  PLANEACION: 'PLANEACION',
  REGISTROS_LIMPIEZA: 'REGISTROS_LIMPIEZA',
  PROCESOS: 'PROCESOS' 
};

const CORREOS_POR_TURNO = {
  'MAÑANA': 'pragestionhumana@pastascomarrico.com',
  'TARDE': 'pragestionhumana@pastascomarrico.com',
  'NOCHE': 'pragestionhumana@pastascomarrico.com'
};

function obtenerCorreoPorTurno(turno) {
  turno = turno.toUpperCase();
  return CORREOS_POR_TURNO[turno] || 'correo.defecto@tudominio.com';
}

function obtenerTurnoContrario(turno) {
  const turnos = {
    'MAÑANA': 'TARDE',
    'TARDE': 'NOCHE',
    'NOCHE': 'MAÑANA'
  };
  
  return turnos[turno.toUpperCase()] || 'TARDE';
}


// ==================== FUNCIONES WEB APP ====================
function doGet(e) {
  const title = 'PHLYD';
  const faviconUrl = 'https://alimentosdoria.com/wp-content/uploads/2023/01/logo-doria.png';
  
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(title)
    .setFaviconUrl(faviconUrl)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== FUNCIONES DE USUARIO ====================
function autenticarUsuario(cedula) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usuariosSheet = ss.getSheetByName(SHEETS.USUARIOS)
    
    if (!usuariosSheet) {
      return { success: false, message: 'No se encontró la hoja de usuarios' };
    }
    
    const data = usuariosSheet.getDataRange().getValues();
    const headers = data[0];
    
    const cedulaCol = headers.indexOf('CEDULA');
    const nombreCol = headers.indexOf('NOMBRE');
    const rolCol = headers.indexOf('ROL');
    const procesoCol = headers.indexOf('PROCESO');
    
    if (cedulaCol === -1 || nombreCol === -1) {
      return { success: false, message: 'Estructura de hoja de usuarios incorrecta' };
    }
    
    // Buscar usuario
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[cedulaCol] && row[cedulaCol].toString().trim() === cedula.trim()) {
        return {
          success: true,
          usuario: {
            cedula: row[cedulaCol],
            nombre: row[nombreCol],
            rol: rolCol !== -1 ? (row[rolCol] || 'operario') : 'operario',
            proceso: procesoCol !== -1 ? (row[procesoCol] || 'GENERAL') : 'GENERAL'
          }
        };
      }
    }
    
    return { success: false, message: 'Usuario no encontrado' };
    
  } catch (error) {
    console.error('Error en autenticación:', error);
    return { success: false, message: 'Error del sistema: ' + error.message };
  }
}

// ==================== FUNCIONES DE MÁQUINAS ====================
function obtenerMaquinas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MAQUINAS);
    if (!sheet) {
      return { success: false, message: 'Hoja MAQUINAS no encontrada', maquinas: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    
    const maquinas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        maquinas.push({
          id: data[i][0].toString(),
          nombre: data[i][1] || '',
          descripcion: data[i][2] || '',
          activa: data[i][3] || 'SI'
        });
      }
    }
    
    return { success: true, maquinas: maquinas };
  } catch (error) {
    return { success: false, message: 'Error al obtener máquinas: ' + error.message, maquinas: [] };
  }
}

function obtenerElementosPorMaquina(maquinaId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ELEMENTOS);
    if (!sheet) {
      return { success: false, message: 'Hoja ELEMENTOS no encontrada', elementos: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    
    const elementos = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString() === maquinaId.toString()) {
        elementos.push({
          id: data[i][0].toString(),
          maquinaId: data[i][1].toString(),
          nombre: data[i][2] || '',
          descripcion: data[i][3] || ''
        });
      }
    }
    
    return { success: true, elementos: elementos };
  } catch (error) {
    return { success: false, message: 'Error al obtener elementos: ' + error.message, elementos: [] };
  }
}

function obtenerMaquinasConElementosPorProceso(procesoUsuario) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    const sheetElementos = ss.getSheetByName(SHEETS.ELEMENTOS);
    
    if (!sheetMaquinas) {
      return { success: false, message: 'Hoja MAQUINAS no encontrada', maquinas: [] };
    }
    
    const maquinasData = sheetMaquinas.getDataRange().getValues();
    const elementosData = sheetElementos ? sheetElementos.getDataRange().getValues() : [];
    
    // Obtener índices de columnas
    const headers = maquinasData[0];
    const procesoCol = headers.indexOf('PROCESO');
    
    // Si no existe columna PROCESO, mostrar todas
    const mostrarTodas = procesoCol === -1;
    
    // Crear mapa de elementos por máquina y componente
    const elementosPorMaquina = {};
    for (let i = 1; i < elementosData.length; i++) {
      if (elementosData[i][0] && elementosData[i][1]) {
        const maquinaId = elementosData[i][1].toString();
        const componenteId = elementosData[i][2] ? elementosData[i][2].toString() : 'principal';
        
        if (!elementosPorMaquina[maquinaId]) {
          elementosPorMaquina[maquinaId] = {};
        }
        if (!elementosPorMaquina[maquinaId][componenteId]) {
          elementosPorMaquina[maquinaId][componenteId] = [];
        }
        
        elementosPorMaquina[maquinaId][componenteId].push({
          id: elementosData[i][0].toString(),
          maquinaId: maquinaId,
          componenteId: componenteId,
          nombre: elementosData[i][3] || '',
          descripcion: elementosData[i][4] || ''
        });
      }
    }
    
    // Crear lista de máquinas filtradas por proceso
    const maquinasConElementos = [];
    for (let i = 1; i < maquinasData.length; i++) {
      if (maquinasData[i][0]) {
        const maquinaId = maquinasData[i][0].toString();
        
        // Filtrar por proceso si existe la columna
        if (!mostrarTodas) {
          const procesoMaquina = maquinasData[i][procesoCol] ? maquinasData[i][procesoCol].toString().trim() : 'GENERAL';
          
          // Mostrar máquinas con proceso GEN (General) o que coincidan con el usuario
          if (procesoMaquina !== 'GENERAL' && procesoMaquina !== procesoUsuario) {
            continue; // Saltar esta máquina
          }
        }
        
        const componentes = [];
        
        // Si hay elementos para esta máquina, organizarlos por componente
        if (elementosPorMaquina[maquinaId]) {
          Object.keys(elementosPorMaquina[maquinaId]).forEach(componenteId => {
            const elementos = elementosPorMaquina[maquinaId][componenteId];
            componentes.push({
              id: componenteId,
              nombre: componenteId === 'principal' ? 'COMPONENTES' : componenteId,
              elementos: elementos
            });
          });
        }
        
        maquinasConElementos.push({
          id: maquinaId,
          nombre: maquinasData[i][1] || '',
          descripcion: maquinasData[i][2] || '',
          activa: maquinasData[i][3] || 'SI',
          proceso: mostrarTodas ? 'GENERAL' : (maquinasData[i][procesoCol] || 'GENERAL'),
          componentes: componentes
        });
      }
    }
    
    return { 
      success: true, 
      maquinas: maquinasConElementos,
      procesoUsuario: procesoUsuario,
      totalFiltradas: maquinasConElementos.length
    };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message, maquinas: [] };
  }
}

// ==================== FUNCIONES DE PLANEACIÓN ====================
function guardarPlaneacion(datos) {
  try {
    console.log('💾 Guardando planeación con estructura jerárquica:', datos);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.PLANEACION);
    
    if (!sheet) {
      return { success: false, message: 'Hoja PLANEACION no encontrada' };
    }
    
    const fechaCreacion = new Date();
    const id = Utilities.getUuid();
    
    // Validar que tenemos datos de elementos
    if (!datos.elementosConfig || datos.elementosConfig.length === 0) {
      return { success: false, message: 'No hay elementos configurados para guardar' };
    }
    
    console.log('📋 ElementosConfig a guardar:', datos.elementosConfig);
    
    // Guardar planeación principal con estructura jerárquica
    sheet.appendRow([
      id,
      datos.maquinaId || '',
      datos.maquinaNombre || '',
      datos.frecuencia || 'Mensual',
      datos.limpiezaSeco ? 'SI' : 'NO',
      datos.limpiezaHumedo ? 'SI' : 'NO',
      datos.desinfeccion ? 'SI' : 'NO',
      JSON.stringify(datos.elementosConfig || []),
      fechaCreacion,
      datos.usuarioCreador || 'Sistema',
      'ACTIVA'
    ]);
    
    console.log('✅ Planeación guardada con ID:', id);
    
    // Crear registros de limpieza pendientes - VERSIÓN MEJORADA
    const registrosCreados = crearRegistrosPendientesJerarquicos(datos, id);
    
    if (registrosCreados > 0) {
      return { 
        success: true, 
        message: 'Planeación guardada correctamente', 
        id: id,
        registrosCreados: registrosCreados
      };
    } else {
      return { 
        success: false, 
        message: 'Planeación guardada pero no se crearon registros de limpieza',
        id: id
      };
    }
    
  } catch (error) {
    console.error('💥 Error guardando planeación:', error);
    return { success: false, message: 'Error al guardar planeación: ' + error.message };
  }
}

function crearRegistrosPendientesJerarquicos(datos, planeacionId) {
  try {
    console.log('📝 === INICIANDO CREAR REGISTROS MEJORADO ===');
    console.log('Planeacion ID:', planeacionId);
    console.log('Datos completos:', datos);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      console.error('❌ CRÍTICO: Hoja REGISTROS_LIMPIEZA no encontrada');
      return 0;
    }
    
    console.log('✅ Hoja REGISTROS_LIMPIEZA encontrada');
    
    // Verificar si la hoja tiene datos
    const lastRow = sheet.getLastRow();
    console.log('Última fila en hoja:', lastRow);
    
    // Inicializar columnas
    const initResult = inicializarColumnasValidacion();
    console.log('Resultado inicialización columnas:', initResult);
    
    const fechaCreacion = new Date();
    const elementosConfig = datos.elementosConfig || [];
    
    console.log('📊 ELEMENTOS CONFIG RECIBIDOS:', elementosConfig);
    console.log('Tipo de elementosConfig:', typeof elementosConfig);
    console.log('Es array?:', Array.isArray(elementosConfig));
    console.log('Longitud:', elementosConfig.length);
    
    if (!Array.isArray(elementosConfig)) {
      console.error('❌ elementosConfig no es un array:', elementosConfig);
      return 0;
    }
    
    if (elementosConfig.length === 0) {
      console.error('❌ elementosConfig está vacío');
      return 0;
    }
    
    let registrosCreados = 0;
    
    // PROCESAR CADA ITEM
    elementosConfig.forEach((item, index) => {
      console.log(`\n--- PROCESANDO ITEM ${index + 1} ---`);
      console.log('Item completo:', item);
      console.log('Tipo del item:', typeof item);
      
      let elementos = [];
      let componenteNombre = 'Componente PRINCIPAL';
      
      // ANÁLISIS DETALLADO DE LA ESTRUCTURA
      if (item && typeof item === 'object') {
        console.log('✅ Item es un objeto');
        
        if (item.elementos && Array.isArray(item.elementos)) {
          console.log('✅ Tiene propiedad "elementos" como array');
          elementos = item.elementos;
          componenteNombre = item.componenteNombre || 'Componente PRINCIPAL';
          console.log(`🔧 Componente: "${componenteNombre}"`);
          console.log(`🔧 Número de elementos: ${elementos.length}`);
        } else if (Array.isArray(item)) {
          console.log('✅ Item es directamente un array de elementos');
          elementos = item;
          componenteNombre = 'COMPONENTES';
        } else {
          console.log('❌ Estructura no reconocida en item:', Object.keys(item));
        }
      } else {
        console.log('❌ Item no es un objeto válido:', item);
      }
      
      // PROCESAR ELEMENTOS
      console.log(`🔄 Procesando ${elementos.length} elementos...`);
      
      elementos.forEach((elemento, elemIndex) => {
        console.log(`\n    📋 ELEMENTO ${elemIndex + 1}:`, elemento);
        console.log('    Tipo del elemento:', typeof elemento);
        
        if (elemento && typeof elemento === 'object') {
          // EXTRAER DATOS CON MÚLTIPLAS OPCIONES
          const elementoId = elemento.elementoId || elemento.id || '';
          const elementoNombre = elemento.elementoNombre || elemento.nombre || '';
          
          console.log(`    🔍 ID: "${elementoId}", Nombre: "${elementoNombre}"`);
          
          if (!elementoId || !elementoNombre) {
            console.log('    ❌ Elemento sin ID o Nombre válido');
            console.log('    Claves disponibles:', Object.keys(elemento));
            return;
          }
          
          // DETERMINAR TIPOS DE LIMPIEZA CON MÚLTIPLAS VERIFICACIONES
          const tiposLimpieza = [];
          
          // Verificar seco
          if (elemento.seco === true || elemento.seco === 'true' || elemento.seco === 'SI' || elemento.seco === 1) {
            tiposLimpieza.push('SECO');
            console.log('    ✅ Limpieza SECO activada');
          }
          
          // Verificar humedo
          if (elemento.humedo === true || elemento.humedo === 'true' || elemento.humedo === 'SI' || elemento.humedo === 1) {
            tiposLimpieza.push('HUMEDO');
            console.log('    ✅ Limpieza HUMEDO activada');
          }
          
          // Verificar desinfeccion
          if (elemento.desinfeccion === true || elemento.desinfeccion === 'true' || elemento.desinfeccion === 'SI' || elemento.desinfeccion === 1) {
            tiposLimpieza.push('DESINFECCION');
            console.log('    ✅ Desinfección activada');
          }
          
          console.log(`    🧹 Tipos finales: ${tiposLimpieza.join(', ')}`);
          
          if (tiposLimpieza.length === 0) {
            console.log('    ⚠️  Elemento sin tipos de limpieza activados');
            console.log('    Valores:', {
              seco: elemento.seco,
              humedo: elemento.humedo,
              desinfeccion: elemento.desinfeccion
            });
          }
          
          // CREAR REGISTROS
          tiposLimpieza.forEach(tipo => {
            const registroId = Utilities.getUuid();
            
            const nuevaFila = [
              registroId,                    // ID
              planeacionId,                  // PLANEACION_ID
              datos.maquinaId || '',         // MAQUINA_ID
              datos.maquinaNombre || '',     // MAQUINA_NOMBRE
              elementoId,                    // ELEMENTO_ID
              elementoNombre,                // ELEMENTO_NOMBRE
              tipo,                          // TIPO_LIMPIEZA
              'PENDIENTE',                   // ESTADO
              '',                            // RESPONSABLE
              '',                            // FECHA_REALIZACION
              '',                            // OBSERVACIONES
              fechaCreacion,                 // FECHA_CREACION
              '',                            // FECHA_FINALIZACION
              componenteNombre,              // COMPONENTE
              '',                            // VALIDADO_POR
              ''                             // FECHA_VALIDACION
            ];
            
            console.log(`    ➕ CREANDO REGISTRO: ${elementoNombre} - ${tipo}`);
            console.log('    Fila a agregar:', nuevaFila);
            
            try {
              sheet.appendRow(nuevaFila);
              registrosCreados++;
              console.log(`    ✅ Registro ${registrosCreados} creado exitosamente`);
            } catch (appendError) {
              console.error('    ❌ Error al agregar fila:', appendError);
            }
          });
        } else {
          console.log('    ❌ Elemento no es un objeto válido:', elemento);
        }
      });
    });
    
    console.log('\n=== RESUMEN FINAL ===');
    console.log(`📈 Registros totales creados: ${registrosCreados}`);
    
    if (registrosCreados === 0) {
      console.log('❌ FALLO CRÍTICO: No se crearon registros');
      console.log('📋 Datos originales recibidos:', {
        planeacionId: planeacionId,
        maquinaId: datos.maquinaId,
        maquinaNombre: datos.maquinaNombre,
        elementosConfig: datos.elementosConfig
      });
    }
    
    return registrosCreados;
    
  } catch (error) {
    console.error('💥 ERROR CRÍTICO EN crearRegistrosPendientesMejorado:', error);
    console.error('Stack trace:', error.stack);
    return 0;
  }
}

function obtenerPlaneacionesPorProceso(procesoUsuario = 'GENERAL') {
  try {
    console.log('🔍 Iniciando obtención de planeaciones para proceso:', procesoUsuario);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPlaneacion = ss.getSheetByName(SHEETS.PLANEACION);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    
    if (!sheetPlaneacion) {
      console.log('❌ Hoja PLANEACION no encontrada');
      return { success: true, planeaciones: [] };
    }
    
    // Obtener todas las máquinas primero para filtrar por proceso
    let maquinasPermitidas = [];
    if (sheetMaquinas) {
      const maquinasData = sheetMaquinas.getDataRange().getValues();
      const headers = maquinasData[0];
      const procesoCol = headers.indexOf('PROCESO');
      const maquinaIdCol = headers.indexOf('ID');
      
      console.log('📊 Procesando máquinas. Total:', maquinasData.length - 1);
      
      // Si no existe columna PROCESO, mostrar todas las máquinas
      if (procesoCol === -1) {
        console.log('⚠️ No hay columna PROCESO en MAQUINAS, mostrando todas');
        // Obtener todos los IDs de máquinas
        for (let i = 1; i < maquinasData.length; i++) {
          if (maquinasData[i][maquinaIdCol]) {
            maquinasPermitidas.push(maquinasData[i][maquinaIdCol].toString().trim());
          }
        }
      } else {
        // Filtrar máquinas por proceso
        for (let i = 1; i < maquinasData.length; i++) {
          if (maquinasData[i][maquinaIdCol]) {
            const maquinaId = maquinasData[i][maquinaIdCol].toString().trim();
            const procesoMaquina = maquinasData[i][procesoCol] ? 
              maquinasData[i][procesoCol].toString().trim() : 'GENERAL';
            
            // Incluir máquinas con proceso GEN (General) o que coincidan con el usuario
            if (procesoMaquina === 'GENERAL' || procesoMaquina === procesoUsuario) {
              maquinasPermitidas.push(maquinaId);
              console.log(`✅ Máquina ${maquinaId} permitida (proceso: ${procesoMaquina})`);
            } else {
              console.log(`❌ Máquina ${maquinaId} excluida (proceso: ${procesoMaquina} ≠ ${procesoUsuario})`);
            }
          }
        }
      }
    } else {
      console.log('⚠️ Hoja MAQUINAS no encontrada, no se puede filtrar por proceso');
    }
    
    const data = sheetPlaneacion.getDataRange().getValues();
    console.log('📊 Datos crudos de planeación:', data.length, 'filas');
    
    // Si solo hay encabezados
    if (data.length <= 1) {
      console.log('ℹ️ Solo hay encabezados en planeación');
      return { 
        success: true, 
        planeaciones: [],
        message: 'No hay planeaciones registradas',
        procesoUsuario: procesoUsuario
      };
    }
    
    const planeaciones = [];
    let totalPlaneaciones = 0;
    let planeacionesFiltradas = 0;
    
    for (let i = 1; i < data.length; i++) {
      totalPlaneaciones++;
      
      // Verificar que hay datos válidos en la fila (al menos ID)
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        const maquinaId = data[i][1] ? data[i][1].toString().trim() : '';
        
        // Filtrar por proceso si hay máquinas filtradas
        if (maquinasPermitidas.length > 0 && !maquinasPermitidas.includes(maquinaId)) {
          console.log(`⏭️ Planeación ${data[i][0]} omitida (máquina ${maquinaId} no permitida)`);
          continue; // Saltar planeación de máquina no permitida
        }
        
        let elementosConfig = [];
        try {
          const configStr = data[i][7] || '[]';
          if (typeof configStr === 'string' && configStr.trim() !== '') {
            elementosConfig = JSON.parse(configStr);
          }
        } catch (e) {
          console.warn('⚠️ Error parseando elementosConfig fila', i + 1, e);
          elementosConfig = [];
        }
        
        const planeacion = {
          id: data[i][0] ? data[i][0].toString().trim() : 'ID_' + i,
          maquinaId: maquinaId,
          maquinaNombre: data[i][2] ? data[i][2].toString().trim() : 'Sin nombre',
          frecuencia: data[i][3] ? data[i][3].toString().trim() : 'Mensual',
          limpiezaSeco: data[i][4] === 'SI',
          limpiezaHumedo: data[i][5] === 'SI',
          desinfeccion: data[i][6] === 'SI',
          elementosConfig: elementosConfig,
          fechaCreacion: data[i][8] ? new Date(data[i][8]).toISOString() : new Date().toISOString(),
          usuarioCreador: data[i][9] ? data[i][9].toString().trim() : 'Sistema',
          estado: data[i][10] ? data[i][10].toString().trim() : 'ACTIVA',
          // Información adicional útil
          procesoAsignado: obtenerProcesoMaquina(maquinaId) || 'GENERAL'
        };
        
        console.log('✅ Planeación incluida:', {
          nombre: planeacion.maquinaNombre,
          id: planeacion.id,
          proceso: planeacion.procesoAsignado
        });
        
        planeaciones.push(planeacion);
        planeacionesFiltradas++;
        
      } else {
        console.log('❌ Fila', i + 1, 'sin ID válido, omitiendo');
      }
    }
    
    console.log('🎯 Resumen planeaciones:');
    console.log('- Total en sistema:', totalPlaneaciones);
    console.log('- Filtradas por proceso:', planeacionesFiltradas);
    console.log('- Proceso usuario:', procesoUsuario);
    console.log('- Máquinas permitidas:', maquinasPermitidas.length);
    
    return { 
      success: true, 
      planeaciones: planeaciones,
      message: `Planeaciones cargadas: ${planeacionesFiltradas} de ${totalPlaneaciones}`,
      procesoUsuario: procesoUsuario,
      estadisticas: {
        total: totalPlaneaciones,
        filtradas: planeacionesFiltradas,
        maquinasPermitidas: maquinasPermitidas.length
      }
    };
    
  } catch (error) {
    console.error('💥 Error crítico en obtenerPlaneaciones:', error);
    return { 
      success: false, 
      message: 'Error al obtener planeaciones: ' + error.message, 
      planeaciones: [],
      procesoUsuario: procesoUsuario || 'GENERAL'
    };
  }
}

// Función auxiliar para obtener el proceso de una máquina
function obtenerProcesoMaquina(maquinaId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    
    if (!sheetMaquinas) return 'GENERAL';
    
    const data = sheetMaquinas.getDataRange().getValues();
    const headers = data[0];
    
    const maquinaIdCol = headers.indexOf('ID');
    const procesoCol = headers.indexOf('PROCESO');
    
    if (maquinaIdCol === -1 || procesoCol === -1) return 'GENERAL';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][maquinaIdCol] && data[i][maquinaIdCol].toString().trim() === maquinaId.toString().trim()) {
        return data[i][procesoCol] ? data[i][procesoCol].toString().trim() : 'GENERAL';
      }
    }
    
    return 'GENERAL';
  } catch (error) {
    console.warn('⚠️ Error obteniendo proceso de máquina:', error);
    return 'GENERAL';
  }
}

// ==================== FUNCIONES DE REGISTROS DE LIMPIEZA ====================
function obtenerRegistrosLimpiezaPorProceso(procesoUsuario, maquinaId, elementoId) {
  try {
    console.log('🔍 Buscando registros para proceso:', procesoUsuario);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetRegistros = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    
    if (!sheetRegistros) {
      return { success: true, registros: [] };
    }
    
    // Obtener máquinas permitidas para este proceso
    let maquinasPermitidas = [];
    if (sheetMaquinas) {
      const maquinasData = sheetMaquinas.getDataRange().getValues();
      const headers = maquinasData[0];
      const procesoCol = headers.indexOf('PROCESO');
      
      for (let i = 1; i < maquinasData.length; i++) {
        if (maquinasData[i][0]) {
          const maquinaId = maquinasData[i][0].toString();
          const procesoMaquina = procesoCol !== -1 ? 
            (maquinasData[i][procesoCol] || 'GENERAL').toString() : 'GENERAL';
          
          if (procesoMaquina === 'GENERAL' || procesoMaquina === procesoUsuario) {
            maquinasPermitidas.push(maquinaId);
          }
        }
      }
    }
    
    const data = sheetRegistros.getDataRange().getValues();
    const registros = [];
    
    const maquinaIdBusqueda = maquinaId ? maquinaId.toString().trim() : null;
    const elementoIdBusqueda = elementoId ? elementoId.toString().trim() : null;
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] || data[i][0].toString().trim() === '') continue;
      
      const regMaquinaId = data[i][2] ? data[i][2].toString().trim() : '';
      
      // Primero filtrar por proceso
      if (maquinasPermitidas.length > 0 && !maquinasPermitidas.includes(regMaquinaId)) {
        continue; // Máquina no permitida para este proceso
      }
      
      const regElementoId = data[i][4] ? data[i][4].toString().trim() : '';
      
      const matchMaquina = !maquinaIdBusqueda || regMaquinaId === maquinaIdBusqueda;
      const matchElemento = !elementoIdBusqueda || regElementoId === elementoIdBusqueda;
      
      if (matchMaquina && matchElemento) {
        // Formatear fechas
        const fechaCreacion = data[i][11] ? formatearFechaCompleta(data[i][11]) : '';
        const fechaFinalizacion = data[i][12] ? formatearFechaCompleta(data[i][12]) : '';
        const fechaRealizacion = data[i][9] ? formatearFechaCompleta(data[i][9]) : '';
        const fechaValidacion = data[i][14] ? formatearFechaCompleta(data[i][14]) : '';
        
        const registro = {
          id: data[i][0].toString(),
          planeacionId: data[i][1] ? data[i][1].toString() : '',
          maquinaId: regMaquinaId,
          maquinaNombre: data[i][3] || '',
          elementoId: regElementoId,
          elementoNombre: data[i][5] || '',
          tipoLimpieza: data[i][6] || '',
          estado: data[i][7] || 'PENDIENTE',
          responsable: data[i][8] || '',
          fechaRealizacion: fechaRealizacion,
          observaciones: data[i][10] || '',
          fechaCreacion: fechaCreacion,
          fechaFinalizacion: fechaFinalizacion,
          componente: data[i][13] || '',
          validadoPor: data[i][14] || '',
          fechaValidacion: fechaValidacion
        };
        
        console.log('✅ REGISTRO COINCIDE:', {
          id: registro.id,
          elementoNombre: registro.elementoNombre,
          tipoLimpieza: registro.tipoLimpieza,
          estado: registro.estado,
          componente: registro.componente
        });
        
        registros.push(registro);
      }
    }
    
    console.log('🎯 Total registros encontrados:', registros.length);
    
    return { 
      success: true, 
      registros: registros,
      proceso: procesoUsuario,
      message: 'Registros filtrados por proceso'
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerRegistrosLimpiezaPorProceso:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message, 
      registros: [] 
    };
  }
}

function obtenerRegistrosLimpieza(maquinaId, elementoId) {
  try {
    console.log('🔍 === INICIANDO BÚSQUEDA DE REGISTROS ===');
    console.log('Parámetros recibidos:', { maquinaId, elementoId });
    console.log('Tipos:', { 
      maquinaIdTipo: typeof maquinaId, 
      elementoIdTipo: typeof elementoId 
    });
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      console.log('❌ Hoja REGISTROS_LIMPIEZA no encontrada');
      return { success: true, registros: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    console.log('📊 Total filas en REGISTROS_LIMPIEZA:', data.length);
    
    if (data.length <= 1) {
      console.log('ℹ️ Solo hay encabezados en registros');
      return { success: true, registros: [] };
    }
    
    // Mostrar headers para referencia
    console.log('📝 Headers:', data[0]);
    
    const registros = [];
    const maquinaIdBusqueda = maquinaId ? maquinaId.toString().trim() : null;
    const elementoIdBusqueda = elementoId ? elementoId.toString().trim() : null;
    
    console.log('🔍 Búsqueda con:', { 
      maquinaIdBusqueda, 
      elementoIdBusqueda 
    });
    
    let coincidencias = 0;
    let noCoincidencias = 0;
    
    for (let i = 1; i < data.length; i++) {
      const fila = i + 1;
      
      if (!data[i][0] || data[i][0].toString().trim() === '') {
        console.log(`Fila ${fila}: Sin ID, omitiendo`);
        continue;
      }
      
      const regMaquinaId = data[i][2] ? data[i][2].toString().trim() : '';
      const regElementoId = data[i][4] ? data[i][4].toString().trim() : '';
      
      const matchMaquina = !maquinaIdBusqueda || regMaquinaId === maquinaIdBusqueda;
      const matchElemento = !elementoIdBusqueda || regElementoId === elementoIdBusqueda;
      
      console.log(`Fila ${fila}:`, {
        regMaquinaId,
        regElementoId,
        matchMaquina,
        matchElemento,
        tipoLimpieza: data[i][6],
        estado: data[i][7]
      });
      
      if (matchMaquina && matchElemento) {
        // Formatear fechas
        const fechaCreacion = data[i][11] ? formatearFechaCompleta(data[i][11]) : '';
        const fechaFinalizacion = data[i][12] ? formatearFechaCompleta(data[i][12]) : '';
        const fechaRealizacion = data[i][9] ? formatearFechaCompleta(data[i][9]) : '';
        const fechaValidacion = data[i][14] ? formatearFechaCompleta(data[i][14]) : '';
        
        const registro = {
          id: data[i][0].toString(),
          planeacionId: data[i][1] ? data[i][1].toString() : '',
          maquinaId: regMaquinaId,
          maquinaNombre: data[i][3] || '',
          elementoId: regElementoId,
          elementoNombre: data[i][5] || '',
          tipoLimpieza: data[i][6] || '',
          estado: data[i][7] || 'PENDIENTE',
          responsable: data[i][8] || '',
          fechaRealizacion: fechaRealizacion,
          observaciones: data[i][10] || '',
          fechaCreacion: fechaCreacion,
          fechaFinalizacion: fechaFinalizacion,
          componente: data[i][13] || '',
          validadoPor: data[i][14] || '',
          fechaValidacion: fechaValidacion
        };
        
        console.log(`✅ REGISTRO COINCIDE ${++coincidencias}:`, {
          id: registro.id,
          elementoNombre: registro.elementoNombre,
          tipoLimpieza: registro.tipoLimpieza,
          estado: registro.estado,
          componente: registro.componente
        });
        
        registros.push(registro);
      } else {
        noCoincidencias++;
      }
    }
    
    console.log('🎯 RESULTADO BÚSQUEDA:');
    console.log('- Coincidencias encontradas:', coincidencias);
    console.log('- No coincidencias:', noCoincidencias);
    console.log('- Total registros retornados:', registros.length);
    
    if (registros.length === 0) {
      console.log('⚠️ ADVERTENCIA: No se encontraron registros');
      console.log('Revisar:');
      console.log('1. ¿Existen registros en la hoja?');
      console.log('2. ¿Los IDs coinciden exactamente?');
      console.log('3. ¿Se crearon registros al guardar la planeación?');
    }
    
    return { 
      success: true, 
      registros: registros,
      message: `${registros.length} registros encontrados`,
      estadisticas: {
        coincidencias: coincidencias,
        totalFilas: data.length - 1
      }
    };
    
  } catch (error) {
    console.error('💥 Error crítico en obtenerRegistrosLimpieza:', error);
    return { 
      success: false, 
      message: 'Error al obtener registros: ' + error.message, 
      registros: [] 
    };
  }
}

// Función específica para debug de un elemento
function debugRegistrosElemento(maquinaId, elementoId) {
  try {
    console.log('🐛 DEBUG ESPECÍFICO para elemento:', { maquinaId, elementoId });
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const resultados = [];
    
    const maquinaIdBusqueda = maquinaId.toString().trim();
    const elementoIdBusqueda = elementoId.toString().trim();
    
    console.log('🔍 Búsqueda con IDs:', { maquinaIdBusqueda, elementoIdBusqueda });
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      
      const regMaquinaId = data[i][2] ? data[i][2].toString().trim() : '';
      const regElementoId = data[i][4] ? data[i][4].toString().trim() : '';
      
      console.log(`Fila ${i + 1}:`, {
        regMaquinaId: regMaquinaId,
        regElementoId: regElementoId,
        matchMaquina: regMaquinaId === maquinaIdBusqueda,
        matchElemento: regElementoId === elementoIdBusqueda
      });
      
      if (regMaquinaId === maquinaIdBusqueda && regElementoId === elementoIdBusqueda) {
        resultados.push({
          fila: i + 1,
          id: data[i][0],
          maquinaId: regMaquinaId,
          elementoId: regElementoId,
          elementoNombre: data[i][5],
          tipoLimpieza: data[i][6],
          estado: data[i][7]
        });
      }
    }
    
    return { 
      success: true, 
      resultados: resultados,
      total: resultados.length,
      busqueda: { maquinaIdBusqueda, elementoIdBusqueda }
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function formatearFechaCompleta(fecha) {
  if (!fecha) return '';
  
  try {
    let fechaObj;
    
    // Convertir a objeto Date
    if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      // Intentar parsear
      fechaObj = new Date(fecha);
    }
    
    // Verificar si es fecha válida
    if (isNaN(fechaObj.getTime())) {
      console.warn('⚠️ Fecha inválida en formatearFechaCompleta:', fecha);
      return '';
    }
    
    // Formatear a yyyy-MM-dd para inputs type="date"
    const año = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const día = String(fechaObj.getDate()).padStart(2, '0');
    
    return `${año}-${mes}-${día}`;
    
  } catch (e) {
    console.warn('⚠️ Error formateando fecha:', e, 'Valor:', fecha);
    return '';
  }
}

// ==================== FUNCIONES DE ESTADÍSTICAS ====================
function obtenerEstadisticasMaquinas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetRegistros = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    
    if (!sheetMaquinas) {
      return { success: true, estadisticas: [] };
    }
    
    const maquinasData = sheetMaquinas.getDataRange().getValues();
    const registrosData = sheetRegistros ? sheetRegistros.getDataRange().getValues() : [];
    
    const estadisticas = [];
    
    for (let i = 1; i < maquinasData.length; i++) {
      if (maquinasData[i][0]) {
        const maquinaId = maquinasData[i][0].toString();
        let totalRegistros = 0;
        let completados = 0;
        
        for (let j = 1; j < registrosData.length; j++) {
          if (registrosData[j][2] && registrosData[j][2].toString() === maquinaId) {
            totalRegistros++;
            if (registrosData[j][7] === 'COMPLETADO') {
              completados++;
            }
          }
        }
        
        const porcentaje = totalRegistros > 0 ? Math.round((completados / totalRegistros) * 100) : 0;
        
        estadisticas.push({
          maquinaId: maquinaId,
          maquinaNombre: maquinasData[i][1] || '',
          totalRegistros: totalRegistros,
          completados: completados,
          porcentaje: porcentaje
        });
      }
    }
    
    return { success: true, estadisticas: estadisticas };
  } catch (error) {
    return { success: false, message: 'Error al obtener estadísticas: ' + error.message, estadisticas: [] };
  }
}

// ==================== INICIALIZACIÓN DE HOJAS ====================
function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // USUARIOS: CEDULA | NOMBRE | ROL | AREA
  let sheet = ss.getSheetByName(SHEETS.USUARIOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.USUARIOS);
    sheet.appendRow(['CEDULA', 'NOMBRE', 'ROL', 'AREA']);
  }
  
  // MAQUINAS: ID | NOMBRE | DESCRIPCION | ACTIVA
  sheet = ss.getSheetByName(SHEETS.MAQUINAS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.MAQUINAS);
    sheet.appendRow(['ID', 'NOMBRE', 'DESCRIPCION', 'ACTIVA']);
  }
  
  // ELEMENTOS: ID | MAQUINA_ID | NOMBRE | DESCRIPCION
  sheet = ss.getSheetByName(SHEETS.ELEMENTOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ELEMENTOS);
    sheet.appendRow(['ID', 'MAQUINA_ID', 'NOMBRE', 'DESCRIPCION']);
  }
  
  // PLANEACION
  sheet = ss.getSheetByName(SHEETS.PLANEACION);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.PLANEACION);
    sheet.appendRow(['ID', 'MAQUINA_ID', 'MAQUINA_NOMBRE', 'FRECUENCIA', 'LIMPIEZA_SECO', 'LIMPIEZA_HUMEDO', 'DESINFECCION', 'ELEMENTOS_CONFIG', 'FECHA_CREACION', 'USUARIO_CREADOR', 'ESTADO']);
  }
  
  // REGISTROS_LIMPIEZA
  sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.REGISTROS_LIMPIEZA);
    sheet.appendRow(['ID', 'PLANEACION_ID', 'MAQUINA_ID', 'MAQUINA_NOMBRE', 'ELEMENTO_ID', 'ELEMENTO_NOMBRE', 'TIPO_LIMPIEZA', 'ESTADO', 'RESPONSABLE', 'FECHA_REALIZACION', 'OBSERVACIONES', 'FECHA_CREACION', 'FECHA_FINALIZACION']);
  }

  sheet = ss.getSheetByName(SHEETS.PROCESOS);
if (!sheet) {
  sheet = ss.insertSheet(SHEETS.PROCESOS);
  sheet.appendRow(['ID', 'NOMBRE', 'DESCRIPCION', 'ACTIVO']);
  // Agregar procesos básicos
  sheet.appendRow(['PROD', 'Producción', 'Proceso de producción principal', 'SI']);
  sheet.appendRow(['CAL', 'Calidad', 'Control de calidad', 'SI']);
  sheet.appendRow(['MANT', 'Mantenimiento', 'Mantenimiento de equipos', 'SI']);
  sheet.appendRow(['LIMP', 'Limpieza', 'Proceso de limpieza', 'SI']);
  sheet.appendRow(['GENERAL', 'General', 'Proceso general (todos)', 'SI']);
}
  
  return 'Hojas inicializadas correctamente';
}

// Función para agregar datos de prueba
function agregarDatosPrueba() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Usuarios de prueba
  const sheetUsuarios = ss.getSheetByName(SHEETS.USUARIOS);
  if (sheetUsuarios) {
    sheetUsuarios.appendRow(['123456', 'Juan Pérez', 'JEFE', 'Producción']);
    sheetUsuarios.appendRow(['789012', 'María García', 'OPERARIO', 'Limpieza']);
  }
  
  // Máquinas de prueba
  const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
  if (sheetMaquinas) {
    for (let i = 17; i <= 33; i++) {
      sheetMaquinas.appendRow([i.toString(), 'Maquina ' + i, 'Máquina de producción ' + i, 'SI']);
    }
  }
  
  // Elementos de prueba
  const sheetElementos = ss.getSheetByName(SHEETS.ELEMENTOS);
  if (sheetElementos) {
    for (let i = 17; i <= 33; i++) {
      for (let j = 1; j <= 3; j++) {
        sheetElementos.appendRow([i + '_' + j, i.toString(), 'Elemento ' + j, 'Área ' + j + ' de la máquina ' + i]);
      }
    }
  }
  
  return 'Datos de prueba agregados';
}

function diagnosticarRegistros() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja REGISTROS_LIMPIEZA no existe' };
    }
    
    const data = sheet.getDataRange().getValues();
    const resultados = {
      totalRegistros: data.length - 1,
      registros: []
    };
    
    console.log('=== DIAGNÓSTICO REGISTROS_LIMPIEZA ===');
    console.log('Total filas:', data.length);
    
    for (let i = 1; i < Math.min(data.length, 10); i++) { // Mostrar solo primeros 10
      if (data[i][0]) {
        resultados.registros.push({
          fila: i + 1,
          id: data[i][0],
          maquinaId: data[i][2],
          maquinaNombre: data[i][3],
          elementoId: data[i][4],
          elementoNombre: data[i][5],
          tipoLimpieza: data[i][6],
          estado: data[i][7]
        });
        
        console.log(`Fila ${i + 1}:`, {
          maquinaId: data[i][2],
          elementoId: data[i][4],
          tipo: data[i][6],
          estado: data[i][7]
        });
      }
    }
    
    return { success: true, diagnostico: resultados };
    
  } catch (error) {
    return { success: false, message: 'Error en diagnóstico: ' + error.message };
  }
}

function validarLimpiezaCompleta(maquinaId, elementoId, validadorNombre) {
  try {
    console.log('👑 Iniciando validación de limpieza completa...', {
      maquinaId: maquinaId,
      elementoId: elementoId,
      validadorNombre: validadorNombre
    });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja REGISTROS_LIMPIEZA no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar índices de columnas
    const idCol = headers.indexOf('ID');
    const maquinaIdCol = headers.indexOf('MAQUINA_ID');
    const elementoIdCol = headers.indexOf('ELEMENTO_ID');
    const estadoCol = headers.indexOf('ESTADO');
    const validadoPorCol = headers.indexOf('VALIDADO_POR');
    const fechaValidacionCol = headers.indexOf('FECHA_VALIDACION');
    
    // Si no existen las columnas de validación, las agregamos
    let needsHeaderUpdate = false;
    if (validadoPorCol === -1) {
      sheet.getRange(1, headers.length + 1).setValue('VALIDADO_POR');
      needsHeaderUpdate = true;
    }
    if (fechaValidacionCol === -1) {
      sheet.getRange(1, headers.length + (needsHeaderUpdate ? 2 : 1)).setValue('FECHA_VALIDACION');
      needsHeaderUpdate = true;
    }
    
    // Si actualizamos headers, refrescamos los datos
    if (needsHeaderUpdate) {
      const newData = sheet.getDataRange().getValues();
      const newHeaders = newData[0];
      
      // Reasignar índices con las nuevas columnas
      const newValidadoPorCol = newHeaders.indexOf('VALIDADO_POR');
      const newFechaValidacionCol = newHeaders.indexOf('FECHA_VALIDACION');
      
      var finalValidadoPorCol = newValidadoPorCol;
      var finalFechaValidacionCol = newFechaValidacionCol;
    } else {
      var finalValidadoPorCol = validadoPorCol;
      var finalFechaValidacionCol = fechaValidacionCol;
    }
    
    let registrosActualizados = 0;
    let registrosPendientes = 0;
    const fechaActual = new Date();
    
    // Buscar y actualizar registros
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que tenemos los datos básicos
      if (!row[maquinaIdCol] || !row[elementoIdCol]) continue;
      
      const rowMaquinaId = row[maquinaIdCol].toString().trim();
      const rowElementoId = row[elementoIdCol].toString().trim();
      
      // Verificar coincidencia
      if (rowMaquinaId === maquinaId.toString().trim() && 
          rowElementoId === elementoId.toString().trim()) {
        
        // Verificar que esté completado
        if (row[estadoCol] === 'COMPLETADO') {
          // Actualizar validación
          if (finalValidadoPorCol !== -1) {
            sheet.getRange(i + 1, finalValidadoPorCol + 1).setValue(validadorNombre);
          }
          if (finalFechaValidacionCol !== -1) {
            sheet.getRange(i + 1, finalFechaValidacionCol + 1).setValue(fechaActual);
          }
          registrosActualizados++;
          console.log(`✅ Registro ${row[idCol]} validado`);
        } else {
          registrosPendientes++;
          console.log(`❌ Registro ${row[idCol]} no está COMPLETADO, estado: ${row[estadoCol]}`);
        }
      }
    }
    
    if (registrosActualizados > 0) {
      return { 
        success: true, 
        message: `Limpieza validada correctamente por ${validadorNombre}. ${registrosActualizados} registros actualizados.`,
        registrosActualizados: registrosActualizados,
        registrosPendientes: registrosPendientes
      };
    } else if (registrosPendientes > 0) {
      return { 
        success: false, 
        message: `No se puede validar. ${registrosPendientes} registro(s) no están completados.` 
      };
    } else {
      return { 
        success: false, 
        message: 'No se encontraron registros para validar' 
      };
    }
    
  } catch (error) {
    console.error('💥 Error validando limpieza:', error);
    return { 
      success: false, 
      message: 'Error del sistema al validar: ' + error.message 
    };
  }
}

function validarMaquinaCompletaPorJefe(maquinaId, validador) {
  try {
    console.log('👑 JEFE: Validando máquina completa...', {
      maquinaId: maquinaId,
      validador: validador
    });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja REGISTROS_LIMPIEZA no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: 'No hay registros en la hoja' };
    }
    
    const headers = data[0];
    console.log('📋 Headers encontrados:', headers);
    
    // Buscar índices de columnas con nombres exactos
    const maquinaIdCol = headers.indexOf('MAQUINA_ID');
    const estadoCol = headers.indexOf('ESTADO');
    const validadoPorCol = headers.indexOf('VALIDADO_POR');
    const fechaValidacionCol = headers.indexOf('FECHA_VALIDACION');
    
    console.log('🔍 Índices de columnas:');
    console.log(`- MAQUINA_ID: ${maquinaIdCol}`);
    console.log(`- ESTADO: ${estadoCol}`);
    console.log(`- VALIDADO_POR: ${validadoPorCol}`);
    console.log(`- FECHA_VALIDACION: ${fechaValidacionCol}`);
    
    // Verificar columnas críticas
    if (maquinaIdCol === -1) {
      return { success: false, message: 'No se encontró la columna MAQUINA_ID' };
    }
    
    if (estadoCol === -1) {
      return { success: false, message: 'No se encontró la columna ESTADO' };
    }
    
    let registrosActualizados = 0;
    let registrosPendientes = 0;
    let registrosYaValidados = 0;
    let registrosNoCompletados = 0;
    const fechaActual = new Date();
    
    console.log(`🔍 Buscando registros de máquina ID: ${maquinaId}`);
    console.log(`📊 Total filas a revisar: ${data.length - 1}`);
    
    // Buscar y actualizar registros de esta máquina
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que es de esta máquina
      if (!row[maquinaIdCol]) {
        continue; // Saltar filas sin MAQUINA_ID
      }
      
      const rowMaquinaId = row[maquinaIdCol].toString().trim();
      
      if (rowMaquinaId === maquinaId.toString().trim()) {
        console.log(`📝 Fila ${i + 1}: Máquina ${rowMaquinaId}`);
        
        // Obtener estado
        const estado = row[estadoCol] ? row[estadoCol].toString().trim() : '';
        console.log(`   Estado: "${estado}"`);
        
        if (estado === 'COMPLETADO') {
          
          // Verificar si ya está validado
          let yaValidado = false;
          if (validadoPorCol !== -1 && row[validadoPorCol]) {
            const validadorActual = row[validadoPorCol].toString().trim();
            yaValidado = validadorActual !== '';
            console.log(`   Validado por: "${validadorActual}" (Ya validado: ${yaValidado})`);
          }
          
          if (!yaValidado) {
            // Actualizar validación si no está ya validado
            if (validadoPorCol !== -1) {
              sheet.getRange(i + 1, validadoPorCol + 1).setValue(validador);
              console.log(`   ✅ Asignado validador: ${validador}`);
            }
            
            if (fechaValidacionCol !== -1) {
              sheet.getRange(i + 1, fechaValidacionCol + 1).setValue(fechaActual);
              console.log(`   📅 Asignada fecha: ${fechaActual}`);
            }
            
            registrosActualizados++;
          } else {
            registrosYaValidados++;
            console.log(`   ℹ️ Ya validado, no se modifica`);
          }
        } else if (estado === 'PENDIENTE' || estado === 'EN PROCESO' || estado === '') {
          registrosNoCompletados++;
          console.log(`   ❌ No completado (${estado})`);
        } else {
          console.log(`   ⚠️ Estado desconocido: ${estado}`);
        }
      }
    }
    
    console.log('📈 RESULTADOS FINALES:');
    console.log(`- Registros actualizados: ${registrosActualizados}`);
    console.log(`- Registros ya validados: ${registrosYaValidados}`);
    console.log(`- Registros no completados: ${registrosNoCompletados}`);
    
    // Determinar mensaje final
    if (registrosActualizados > 0) {
      return { 
        success: true, 
        message: `✅ Máquina validada correctamente por ${validador}. 
                  ${registrosActualizados} registros actualizados.
                  ${registrosYaValidados} ya estaban validados.
                  ${registrosNoCompletados} no estaban completados.`,
        registrosActualizados: registrosActualizados,
        registrosYaValidados: registrosYaValidados,
        registrosNoCompletados: registrosNoCompletados
      };
    } else if (registrosYaValidados > 0 && registrosNoCompletados === 0) {
      return { 
        success: false, 
        message: `ℹ️ Todos los registros (${registrosYaValidados}) ya están validados. No hay nada nuevo que validar.`
      };
    } else if (registrosNoCompletados > 0) {
      return { 
        success: false, 
        message: `❌ No se puede validar. ${registrosNoCompletados} registro(s) no están completados.`
      };
    } else {
      return { 
        success: false, 
        message: 'ℹ️ No se encontraron registros de esta máquina para validar.'
      };
    }
    
  } catch (error) {
    console.error('💥 Error validando máquina completa:', error);
    return { 
      success: false, 
      message: 'Error del sistema: ' + error.message 
    };
  }
}

function actualizarRegistroLimpiezaCompleto(registroId, datos) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja REGISTROS_LIMPIEZA no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('ID');
    const estadoCol = headers.indexOf('ESTADO');
    const responsableCol = headers.indexOf('RESPONSABLE');
    const fechaRealizacionCol = headers.indexOf('FECHA_REALIZACION');
    const observacionesCol = headers.indexOf('OBSERVACIONES');
    const fechaFinalizacionCol = headers.indexOf('FECHA_FINALIZACION');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] && data[i][idCol].toString() === registroId.toString()) {
        // Actualizar campos básicos
        sheet.getRange(i + 1, estadoCol + 1).setValue(datos.estado || 'PENDIENTE');
        sheet.getRange(i + 1, responsableCol + 1).setValue(datos.responsable || '');
        sheet.getRange(i + 1, fechaRealizacionCol + 1).setValue(datos.fechaRealizacion || '');
        sheet.getRange(i + 1, observacionesCol + 1).setValue(datos.observaciones || '');
        
        // Si se marca como COMPLETADO, registrar fecha de finalización
        if (datos.estado === 'COMPLETADO') {
          sheet.getRange(i + 1, fechaFinalizacionCol + 1).setValue(new Date());
        }
        
        return { success: true, message: 'Registro actualizado correctamente' };
      }
    }
    
    return { success: false, message: 'Registro no encontrado' };
  } catch (error) {
    return { success: false, message: 'Error al actualizar registro: ' + error.message };
  }
}

function inicializarColumnasValidacion() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      console.error('❌ Hoja REGISTROS_LIMPIEZA no existe');
      return { success: false, message: 'Hoja no encontrada' };
    }
    
    // Obtener todos los datos
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    console.log('📊 Estado actual de la hoja:');
    console.log('Filas:', data.length);
    console.log('Columnas:', data.length > 0 ? data[0].length : 0);
    
    if (data.length === 0) {
      // Hoja completamente vacía - crear headers completos
      const headersCompletos = [
        'ID', 'PLANEACION_ID', 'MAQUINA_ID', 'MAQUINA_NOMBRE', 
        'ELEMENTO_ID', 'ELEMENTO_NOMBRE', 'TIPO_LIMPIEZA', 'ESTADO',
        'RESPONSABLE', 'FECHA_REALIZACION', 'OBSERVACIONES', 
        'FECHA_CREACION', 'FECHA_FINALIZACION', 'COMPONENTE',
        'VALIDADO_POR', 'FECHA_VALIDACION'
      ];
      
      sheet.appendRow(headersCompletos);
      console.log('✅ Headers completos creados');
      return { success: true, message: 'Headers creados' };
    }
    
    const headers = data[0];
    console.log('Headers actuales:', headers);
    
    // Verificar columnas requeridas
    const columnasRequeridas = ['COMPONENTE', 'VALIDADO_POR', 'FECHA_VALIDACION'];
    let columnasFaltantes = [];
    
    columnasRequeridas.forEach(columna => {
      if (headers.indexOf(columna) === -1) {
        columnasFaltantes.push(columna);
      }
    });
    
    if (columnasFaltantes.length > 0) {
      console.log('📋 Columnas faltantes:', columnasFaltantes);
      
      // Agregar columnas faltantes
      columnasFaltantes.forEach(columna => {
        const newColIndex = headers.length + 1;
        sheet.getRange(1, newColIndex).setValue(columna);
        headers.push(columna);
        console.log(`✅ Columna ${columna} agregada en posición ${newColIndex}`);
      });
      
      return { 
        success: true, 
        message: `Columnas agregadas: ${columnasFaltantes.join(', ')}` 
      };
    } else {
      console.log('✅ Todas las columnas requeridas existen');
      return { success: true, message: 'Columnas OK' };
    }
    
  } catch (error) {
    console.error('💥 Error en inicializarColumnasValidacion:', error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function eliminarPlaneacionesMaquina(maquinaId) {
  try {
    console.log('🗑️ Eliminando planeaciones de máquina:', maquinaId);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPlaneacion = ss.getSheetByName(SHEETS.PLANEACION);
    const sheetRegistros = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheetPlaneacion) {
      return { success: false, message: 'Hoja PLANEACION no encontrada' };
    }
    
    const planeacionesData = sheetPlaneacion.getDataRange().getValues();
    let eliminadas = 0;
    let planeacionesAEliminar = [];
    
    // Encontrar planeaciones a eliminar
    for (let i = 1; i < planeacionesData.length; i++) {
      if (planeacionesData[i][1] && planeacionesData[i][1].toString().trim() === maquinaId.toString().trim()) {
        planeacionesAEliminar.push({
          fila: i + 1,
          id: planeacionesData[i][0],
          maquinaNombre: planeacionesData[i][2]
        });
      }
    }
    
    // Eliminar en orden inverso para no afectar índices
    planeacionesAEliminar.reverse().forEach(planeacion => {
      sheetPlaneacion.deleteRow(planeacion.fila);
      eliminadas++;
      console.log(`✅ Planeación eliminada: ${planeacion.id} (${planeacion.maquinaNombre})`);
    });
    
    // También eliminar registros de limpieza asociados
    let registrosEliminados = 0;
    if (sheetRegistros && eliminadas > 0) {
      const registrosData = sheetRegistros.getDataRange().getValues();
      let registrosAEliminar = [];
      
      for (let i = 1; i < registrosData.length; i++) {
        if (registrosData[i][2] && registrosData[i][2].toString().trim() === maquinaId.toString().trim()) {
          registrosAEliminar.push(i + 1);
        }
      }
      
      // Eliminar en orden inverso
      registrosAEliminar.reverse().forEach(fila => {
        sheetRegistros.deleteRow(fila);
        registrosEliminados++;
      });
      
      console.log(`🗑️ Eliminados ${registrosEliminados} registros de limpieza`);
    }
    
    return { 
      success: true, 
      message: `Eliminadas ${eliminadas} planeación(es) y ${registrosEliminados} registro(s) de limpieza`,
      eliminadas: eliminadas,
      registrosEliminados: registrosEliminados
    };
    
  } catch (error) {
    console.error('💥 Error eliminando planeaciones:', error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

// ==================== FUNCIONES PARA OBTENER ESTRUCTURA JERÁRQUICA ====================

function obtenerComponentesPorMaquina(maquinaId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetElementos = ss.getSheetByName(SHEETS.ELEMENTOS);
    
    if (!sheetElementos) {
      console.log('⚠️ Hoja ELEMENTOS no encontrada');
      return [];
    }
    
    const data = sheetElementos.getDataRange().getValues();
    const headers = data[0];
    
    // Buscar índices de columnas
    const maquinaIdCol = headers.indexOf('MAQUINA_ID');
    const componenteCol = headers.indexOf('COMPONENTE');
    const elementoIdCol = headers.indexOf('ID');
    const elementoNombreCol = headers.indexOf('NOMBRE');
    
    // Si no existe columna COMPONENTE, usar estructura simple
    const hasComponentes = componenteCol !== -1;
    
    const componentesMap = new Map();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verificar que el elemento pertenezca a esta máquina
      if (row[maquinaIdCol] && row[maquinaIdCol].toString().trim() === maquinaId.toString().trim()) {
        const componenteNombre = hasComponentes && row[componenteCol] ? 
          row[componenteCol].toString().trim() : 'COMPONENTES';
        
        // Si no existe el componente en el mapa, crearlo
        if (!componentesMap.has(componenteNombre)) {
          componentesMap.set(componenteNombre, {
            id: componenteNombre.toLowerCase().replace(/\s+/g, '-'),
            nombre: componenteNombre,
            elementos: []
          });
        }
        
        // Agregar elemento al componente
        const elemento = {
          id: row[elementoIdCol] ? row[elementoIdCol].toString().trim() : '',
          nombre: row[elementoNombreCol] || 'Sin nombre',
          descripcion: row[headers.indexOf('DESCRIPCION')] || ''
        };
        
        componentesMap.get(componenteNombre).elementos.push(elemento);
      }
    }
    
    // Convertir mapa a array
    const componentes = Array.from(componentesMap.values());
    
    // Si no hay componentes, crear uno genérico
    if (componentes.length === 0) {
      componentes.push({
        id: 'principal',
        nombre: 'COMPONENTES',
        elementos: []
      });
    }
    
    console.log(`✅ Componentes para máquina ${maquinaId}: ${componentes.length}`);
    
    return componentes;
    
  } catch (error) {
    console.error('💥 Error en obtenerComponentesPorMaquina:', error);
    return [];
  }
}

function obtenerTodasLasMaquinasConElementos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetMaquinas = ss.getSheetByName(SHEETS.MAQUINAS);
    
    if (!sheetMaquinas) {
      return { success: false, message: 'Hoja MAQUINAS no encontrada', maquinas: [] };
    }
    
    const maquinasData = sheetMaquinas.getDataRange().getValues();
    const headers = maquinasData[0];
    
    const maquinas = [];
    
    // Obtener índices de columnas
    const idCol = headers.indexOf('ID');
    const nombreCol = headers.indexOf('NOMBRE');
    const procesoCol = headers.indexOf('PROCESO');
    
    for (let i = 1; i < maquinasData.length; i++) {
      const row = maquinasData[i];
      
      if (row[idCol]) {
        const maquinaId = row[idCol].toString().trim();
        const maquina = {
          id: maquinaId,
          nombre: row[nombreCol] || 'Sin nombre',
          procesoAsignado: procesoCol !== -1 ? (row[procesoCol] || 'GENERAL').toString().trim() : 'GENERAL',
          descripcion: row[headers.indexOf('DESCRIPCION')] || '',
          activa: row[headers.indexOf('ACTIVA')] || 'SI',
          componentes: obtenerComponentesPorMaquina(maquinaId) // Usar la nueva función
        };
        
        maquinas.push(maquina);
      }
    }
    
    console.log(`✅ Todas las máquinas obtenidas: ${maquinas.length}`);
    
    return { 
      success: true, 
      maquinas: maquinas,
      message: `Total máquinas: ${maquinas.length}`
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerTodasLasMaquinasConElementos:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message, 
      maquinas: [] 
    };
  }
}

function obtenerMaquinasConElementos(procesoUsuario = 'GENERAL') {
  try {
    // Si el usuario es GEN, obtener todas las máquinas
    if (procesoUsuario === 'GENERAL') {
      return obtenerTodasLasMaquinasConElementos();
    }
    
    // Si no es GEN, usar la función existente
    return obtenerMaquinasConElementosPorProceso(procesoUsuario);
    
  } catch (error) {
    console.error('💥 Error en obtenerMaquinasConElementos:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message, 
      maquinas: [] 
    };
  }
}

function obtenerTodasLasPlaneaciones() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPlaneacion = ss.getSheetByName(SHEETS.PLANEACION);
    
    if (!sheetPlaneacion) {
      return { success: true, planeaciones: [] };
    }
    
    const data = sheetPlaneacion.getDataRange().getValues();
    
    // Si solo hay encabezados
    if (data.length <= 1) {
      return { 
        success: true, 
        planeaciones: [],
        message: 'No hay planeaciones registradas'
      };
    }
    
    const planeaciones = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        const maquinaId = data[i][1] ? data[i][1].toString().trim() : '';
        
        let elementosConfig = [];
        try {
          const configStr = data[i][7] || '[]';
          if (typeof configStr === 'string' && configStr.trim() !== '') {
            elementosConfig = JSON.parse(configStr);
          }
        } catch (e) {
          elementosConfig = [];
        }
        
        // Obtener proceso de la máquina
        const procesoAsignado = obtenerProcesoMaquina(maquinaId) || 'GENERAL';
        
        const planeacion = {
          id: data[i][0].toString(),
          maquinaId: maquinaId,
          maquinaNombre: data[i][2] || 'Sin nombre',
          frecuencia: data[i][3] || 'Mensual',
          limpiezaSeco: data[i][4] === 'SI',
          limpiezaHumedo: data[i][5] === 'SI',
          desinfeccion: data[i][6] === 'SI',
          elementosConfig: elementosConfig,
          fechaCreacion: data[i][8] ? new Date(data[i][8]).toISOString() : new Date().toISOString(),
          usuarioCreador: data[i][9] || 'Sistema',
          estado: data[i][10] || 'ACTIVA',
          procesoAsignado: procesoAsignado
        };
        
        planeaciones.push(planeacion);
      }
    }
    
    return { 
      success: true, 
      planeaciones: planeaciones,
      message: `Total planeaciones: ${planeaciones.length}`
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerTodasLasPlaneaciones:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message, 
      planeaciones: [] 
    };
  }
}

function obtenerTodosRegistrosLimpieza() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: true, registros: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, registros: [] };
    }
    
    const registros = [];
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] || data[i][0].toString().trim() === '') continue;
      
      // Formatear fechas
      const fechaCreacion = data[i][11] ? formatearFechaCompleta(data[i][11]) : '';
      const fechaFinalizacion = data[i][12] ? formatearFechaCompleta(data[i][12]) : '';
      const fechaRealizacion = data[i][9] ? formatearFechaCompleta(data[i][9]) : '';
      const fechaValidacion = data[i][15] ? formatearFechaCompleta(data[i][15]) : '';
      
      const registro = {
        id: data[i][0].toString(),
        planeacionId: data[i][1] || '',
        maquinaId: data[i][2] ? data[i][2].toString().trim() : '',
        maquinaNombre: data[i][3] || '',
        elementoId: data[i][4] ? data[i][4].toString().trim() : '',
        elementoNombre: data[i][5] || '',
        tipoLimpieza: data[i][6] || '',
        estado: data[i][7] || 'PENDIENTE',
        responsable: data[i][8] || '',
        fechaRealizacion: fechaRealizacion,
        observaciones: data[i][10] || '',
        fechaCreacion: fechaCreacion,
        fechaFinalizacion: fechaFinalizacion,
        componente: data[i][13] || '',
        validadoPor: data[i][14] || '',
        fechaValidacion: fechaValidacion
      };
      
      registros.push(registro);
    }
    
    return { 
      success: true, 
      registros: registros,
      message: `Total registros: ${registros.length}`
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerTodosRegistrosLimpieza:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message, 
      registros: [] 
    };
  }
}

function obtenerInfoValidacionMaquina(maquinaId) {
  try {
    console.log('🔍 Obteniendo información de máquina:', maquinaId);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheet) {
      return { success: false, message: 'Hoja de registros no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log('ℹ️ Hoja vacía o solo con headers');
      return { 
        success: true, 
        datos: {
          total: 0,
          completados: 0,
          pendientes: 0,
          yaValidados: 0,
          porcentaje: 0,
          puedeValidar: false,
          message: 'No hay registros en la hoja'
        }
      };
    }
    
    const headers = data[0];
    
    // Buscar columnas con nombres exactos
    const maquinaIdCol = headers.indexOf('MAQUINA_ID');
    const estadoCol = headers.indexOf('ESTADO');
    const validadoPorCol = headers.indexOf('VALIDADO_POR');
    
    console.log('🔍 Índices de columnas:');
    console.log(`- MAQUINA_ID: ${maquinaIdCol} (columna ${maquinaIdCol + 1})`);
    console.log(`- ESTADO: ${estadoCol} (columna ${estadoCol + 1})`);
    console.log(`- VALIDADO_POR: ${validadoPorCol} (columna ${validadoPorCol + 1})`);
    
    if (maquinaIdCol === -1) {
      console.error('❌ MAQUINA_ID no encontrada');
      return { success: false, message: 'No se encontró la columna MAQUINA_ID' };
    }
    
    let total = 0;
    let completados = 0;
    let pendientes = 0;
    let yaValidados = 0;
    
    console.log(`🔍 Analizando registros para máquina: ${maquinaId}`);
    console.log(`📊 Total filas: ${data.length - 1}`);
    
    // Contar registros de esta máquina
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Saltar filas vacías
      if (!row[maquinaIdCol] || row[maquinaIdCol].toString().trim() === '') {
        continue;
      }
      
      const rowMaquinaId = row[maquinaIdCol].toString().trim();
      
      // DEBUG: Verificar coincidencias
      if (i < 10) { // Solo mostrar primeros 10 para debug
        console.log(`Fila ${i + 1}: ID="${rowMaquinaId}", Buscando: "${maquinaId}"`);
      }
      
      if (rowMaquinaId === maquinaId.toString().trim()) {
        total++;
        
        const estado = row[estadoCol] ? row[estadoCol].toString().trim() : 'PENDIENTE';
        
        console.log(`   ✅ Coincidencia fila ${i + 1}: Estado="${estado}"`);
        
        if (estado === 'COMPLETADO') {
          completados++;
          
          // Verificar si ya está validado
          if (validadoPorCol !== -1 && row[validadoPorCol]) {
            const validador = row[validadoPorCol].toString().trim();
            if (validador !== '') {
              yaValidados++;
              console.log(`       Ya validado por: ${validador}`);
            }
          }
        } else {
          pendientes++;
        }
      }
    }
    
    const puedeValidar = completados === total && total > 0 && yaValidados === 0;
    
    console.log('📊 RESULTADOS ANÁLISIS:');
    console.log(`- Total registros: ${total}`);
    console.log(`- Completados: ${completados}`);
    console.log(`- Pendientes: ${pendientes}`);
    console.log(`- Ya validados: ${yaValidados}`);
    console.log(`- Porcentaje completados: ${total > 0 ? Math.round((completados / total) * 100) : 0}%`);
    console.log(`- Puede validar: ${puedeValidar} (${completados}/${total} completados, ${yaValidados} ya validados)`);
    
    return {
      success: true,
      datos: {
        total: total,
        completados: completados,
        pendientes: pendientes,
        yaValidados: yaValidados,
        porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0,
        puedeValidar: puedeValidar,
        message: `Análisis completado. ${total} registros encontrados.`
      }
    };
    
  } catch (error) {
    console.error('💥 Error en obtenerInfoValidacionMaquina:', error);
    return { 
      success: false, 
      message: 'Error: ' + error.message,
      datos: {
        total: 0,
        completados: 0,
        pendientes: 0,
        yaValidados: 0,
        porcentaje: 0,
        puedeValidar: false,
        message: 'Error al obtener información'
      }
    };
  }
}

// Agrega esta función en tu código de Apps Script
function obtenerFrecuenciaPorElemento(maquinaId, elementoId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPlaneacion = ss.getSheetByName(SHEETS.PLANEACION);
    
    if (!sheetPlaneacion) {
      return 'No planificado';
    }
    
    const data = sheetPlaneacion.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim() === maquinaId.toString().trim()) {
        try {
          const configStr = data[i][7] || '[]';
          const elementosConfig = JSON.parse(configStr);
          
          if (Array.isArray(elementosConfig)) {
            for (const componente of elementosConfig) {
              if (componente.elementos && Array.isArray(componente.elementos)) {
                for (const elemento of componente.elementos) {
                  if (elemento.elementoId && elemento.elementoId.toString() === elementoId.toString()) {
                    return data[i][3] || 'Mensual'; // Retorna la frecuencia de esta planeación
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error parseando elementosConfig:', e);
        }
      }
    }
    
    return 'No planificado';
  } catch (error) {
    console.error('Error obteniendo frecuencia:', error);
    return 'No planificado';
  }
}

function generarReporteMaquinaPDF(maquinaId, maquinaNombre, jefeOrigenNombre, jefeOrigenCedula, turnoOrigen, turnoDestino, proceso) {
  try {
    // 1. Obtener detalles de la máquina
    const detallesMaquina = obtenerDetallesCompletosMaquina(maquinaId);
    
    if (!detallesMaquina) {
      return { success: false, message: 'No se encontró la máquina' };
    }
    
    // 2. Verificar que esté validada
    if (detallesMaquina.estadoGeneral !== 'VALIDADO') {
      return { success: false, message: 'La máquina no está validada' };
    }
    
    // 3. Obtener correo destino
    const emailDestino = obtenerCorreoPorTurno(turnoDestino);
    
    // 4. Generar HTML del reporte
    const htmlContent = generarHTMLReporteMaquina(detallesMaquina, jefeOrigenNombre, turnoOrigen, turnoDestino);
    
    // 5. Crear PDF
    const pdfBlob = crearPDF(htmlContent);
    
    // 6. Enviar email
    enviarEmailReporteMaquina(emailDestino, pdfBlob, detallesMaquina, jefeOrigenNombre, turnoOrigen, turnoDestino);
    
    // 7. Registrar
    registrarReporteMaquina(maquinaId, maquinaNombre, jefeOrigenNombre, jefeOrigenCedula, turnoOrigen, turnoDestino, emailDestino);
    
    return { 
      success: true, 
      message: 'Reporte enviado',
      emailDestino: emailDestino
    };
    
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}

function obtenerDetallesCompletosMaquina(maquinaId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetRegistros = ss.getSheetByName(SHEETS.REGISTROS_LIMPIEZA);
    
    if (!sheetRegistros) return null;
    
    const data = sheetRegistros.getDataRange().getValues();
    const headers = data[0];
    
    let maquinaNombre = '';
    let estadoGeneral = 'PENDIENTE';
    let elementos = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] && data[i][2].toString().trim() === maquinaId.toString().trim()) {
        if (!maquinaNombre && data[i][3]) {
          maquinaNombre = data[i][3];
        }
        
        if (data[i][14] && data[i][14] !== '') {
          estadoGeneral = 'VALIDADO';
        }
        
        const elemento = {
          nombre: data[i][5] || '',
          tipoLimpieza: data[i][6] || '',
          estado: data[i][7] || '',
          responsable: data[i][8] || '',
          validadoPor: data[i][14] || ''
        };
        
        elementos.push(elemento);
      }
    }
    
    return {
      maquinaId: maquinaId,
      maquinaNombre: maquinaNombre,
      estadoGeneral: estadoGeneral,
      elementos: elementos,
      totalElementos: elementos.length,
      elementosValidados: elementos.filter(e => e.validadoPor !== '').length
    };
    
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

function generarHTMLReporteMaquina(detalles, jefeOrigen, turnoOrigen, turnoDestino) {
  const fecha = new Date().toLocaleDateString('es-ES');
  const porcentaje = detalles.totalElementos > 0 ? 
    Math.round((detalles.elementosValidados / detalles.totalElementos) * 100) : 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { background: #1e40af; color: white; padding: 10px; }
        .table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .footer { margin-top: 30px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>REPORTE DE MÁQUINA VALIDADA</h2>
        <p><strong>${detalles.maquinaNombre}</strong> | ID: ${detalles.maquinaId}</p>
        <p>Generado por: ${jefeOrigen} | Turno: ${turnoOrigen} → ${turnoDestino}</p>
        <p>Fecha: ${fecha}</p>
      </div>
      
      <h3>Resumen</h3>
      <p>Elementos validados: ${detalles.elementosValidados}/${detalles.totalElementos} (${porcentaje}%)</p>
      
      <table class="table">
        <thead>
          <tr>
            <th>Elemento</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Responsable</th>
            <th>Validador</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.elementos.map(elemento => `
            <tr>
              <td>${elemento.nombre}</td>
              <td>${elemento.tipoLimpieza}</td>
              <td>${elemento.estado}</td>
              <td>${elemento.responsable}</td>
              <td>${elemento.validadoPor || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <hr>
        <p>Sistema PHLYD - Reporte automático</p>
      </div>
    </body>
    </html>
  `;
}

function crearPDF(htmlContent) {
  const blob = Utilities.newBlob(htmlContent, 'text/html', 'reporte.html');
  const pdf = blob.getAs('application/pdf');
  
  const fecha = new Date();
  const nombreArchivo = `Reporte_${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}.pdf`;
  pdf.setName(nombreArchivo);
  
  return pdf;
}

function enviarEmailReporteMaquina(emailDestino, pdfBlob, detalles, jefeOrigen, turnoOrigen, turnoDestino) {
  const subject = `Reporte Máquina Validada: ${detalles.maquinaNombre}`;
  
  const body = `
    <h3>Reporte de Máquina Validada</h3>
    <p><strong>Máquina:</strong> ${detalles.maquinaNombre}</p>
    <p><strong>Jefe Origen:</strong> ${jefeOrigen} (Turno ${turnoOrigen})</p>
    <p><strong>Turno Destino:</strong> ${turnoDestino}</p>
    <p><strong>Elementos validados:</strong> ${detalles.elementosValidados}/${detalles.totalElementos}</p>
    <hr>
    <p>Se adjunta reporte PDF detallado.</p>
    <p><em>Reporte automático - Sistema PHLYD</em></p>
  `;
  
  MailApp.sendEmail({
    to: emailDestino,
    subject: subject,
    htmlBody: body,
    attachments: [pdfBlob]
  });
}

function registrarReporteMaquina(maquinaId, maquinaNombre, jefeOrigen, jefeOrigenCedula, turnoOrigen, turnoDestino, emailDestino) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheetReportes = ss.getSheetByName('REPORTES_MAQUINAS');
    
    if (!sheetReportes) {
      sheetReportes = ss.insertSheet('REPORTES_MAQUINAS');
      sheetReportes.appendRow(['FECHA', 'MAQUINA_ID', 'MAQUINA_NOMBRE', 'JEFE_ORIGEN', 'TURNO_ORIGEN', 'TURNO_DESTINO', 'EMAIL_DESTINO', 'ESTADO']);
    }
    
    sheetReportes.appendRow([
      new Date().toISOString(),
      maquinaId,
      maquinaNombre,
      jefeOrigen,
      turnoOrigen,
      turnoDestino,
      emailDestino,
      'ENVIADO'
    ]);
    
  } catch (error) {
    console.error('Error registrando reporte:', error);
  }
}
