# Protocolo de Higiene, Limpieza y Desinfección

## Descripción General

**Protocolo de Higiene, Limpieza y Desinfección** (PHLYD) es una aplicación web desarrollada con **Google Apps Script** para gestionar y estructurar los procedimientos de limpieza y desinfección de equipos e instalaciones en un entorno industrial. El sistema está diseñado para planificar cronogramas de limpieza, registrar su ejecución, validar resultados y ofrecer seguimiento a través de interfaces web accesibles para operarios y supervisores.

---

## Objetivos del Sistema

El sistema tiene como propósito:

- Centralizar y estandarizar la gestión de protocolos de limpieza y desinfección.
- Permitir la planificación de actividades de higiene en múltiples niveles jerárquicos (máquinas, componentes, elementos).
- Registrar y hacer seguimiento de las acciones de limpieza ejecutadas por operarios.
- Proveer herramientas de validación para supervisores.
- Facilitar la visualización del estado de limpieza en un tablero consolidado. 

---

## Arquitectura del Sistema

La aplicación está organizada en tres capas principales:

### Capa de Presentación

La interfaz está desarrollada en **HTML, CSS y JavaScript**, implementada como una única página web que se comunica con el backend mediante la interfaz `google.script.run`. 

### Capa de Lógica de Negocio

El backend está construido con **Google Apps Script**, encargado de:

- Autenticación de usuarios.
- Gestión de datos y almacenamiento.
- Procesos de planificación y validación de limpieza.
- Comunicación con la interfaz cliente. 

### Capa de Persistencia

Los datos se almacenan en estructuras de Google Apps Script vinculadas a:

- **Google Sheets** para registros estructurados.
- **Sistemas de cache interno** para mejorar el acceso y el rendimiento de lectura. 

---

## Flujo Funcional

El flujo principal del sistema sigue estas etapas:

### 1. Autenticación y Carga Inicial

- El usuario inicia sesión mediante identificación.
- El sistema valida el rol y proceso asignado.
- Se cargan jerarquías de máquinas, componentes y elementos para el proceso asignado. 

---

### 2. Planificación de Limpieza

- El usuario selecciona elementos de la jerarquía.
- Se configuran los tipos de limpieza requeridos.
- La planificación se guarda en estructuras que facilitan su ejecución posterior. 

---

### 3. Ejecución y Registro de Limpieza

- Los operarios pueden registrar acciones de limpieza para cada elemento.
- El sistema controla y actualiza estados según se completan las actividades. 

---

### 4. Validación de Limpieza

- Supervisores pueden validar las acciones completadas por los operarios.
- La validación asegura que los elementos han sido limpiados según lo planificado. 

---

### 5. Visualización Consolidada

- El sistema presenta un tablero donde se observa el estado de limpieza de todos los elementos.
- Los estados ayudan en la gestión de prioridades y en el seguimiento de cumplimiento. 

---

## Modelo de Datos y Gestión de Estado

El sistema administra un modelo jerárquico para la limpieza:

- **Máquinas**
  - **Componentes**
    - **Elementos**

Cada elemento puede tener múltiples tipos de limpieza asociados, y el sistema determina su estado actual en función de los registros existentes. Para mejorar el rendimiento, se utiliza un mecanismo de cache interno que evita múltiples consultas repetidas. 

---

## Control de Acceso por Roles

El sistema diferencia dos roles principales:

| Rol        | Permisos principales |
|------------|-----------------------|
| Operario   | Planificar y ejecutar limpieza en elementos asignados |
| Supervisor | Validar limpieza, ver estado consolidado de todos los elementos |

La funcionalidad y visibilidad de datos está filtrada según el rol y el proceso al que pertenece el usuario. 

---

## Detalles Técnicos

### Comunicación Cliente-Servidor

La comunicación entre la interfaz web y el backend utiliza la API `google.script.run`, que permite invocar funciones de Apps Script desde el navegador y recibir sus resultados de manera asíncrona. 

---

### Variables de Estado Global

El sistema mantiene variables de estado global para manejar:

- Usuario actual (`currentUser`)
- Jerarquía completa de elementos (`maquinasData`)
- Datos seleccionados para planificación
- Cache de estados de elementos

Estas variables permiten que la interfaz responda rápidamente sin múltiples llamadas innecesarias al backend. 

---

## Estructura de Archivos

```text

/
├── docs/
│   └── Functions/
│       ├── Limpieza/
│       │   ├── confirmCleaning.html
│       │   ├── confirmCleaningOperator.html
│       │   ├── elements.html
│       │   ├── elementsDetail.html
│       │   ├── sections.html
│       │   └── Validations.html
│       ├── Planeacion/
│       │   ├── configs.html
│       │   ├── consolidate.html
│       │   ├── delete.html
│       │   ├── planeation.html
│       │   └── treePlaneation.html
│       ├── alerts.html
│       ├── auth.html
│       ├── consolidateValidate.html
│       ├── dates.html
│       ├── debug.html
│       ├── initload.html
│       ├── modals.html
│       ├── report.html
│       ├── shifts.html
│       ├── sidebar.html
│       ├── states.html
│       ├── stats.html
│       ├── tabs.html
│       ├── utils.html
│       └── variables.html
├── html/
│   ├── index.html
│   └── styles.html
├── .clasp.json
├── appsscript.json
├── Código.js
└── README.md

```
---

## Flujo del Sistema

![Arquitectura del sistema](docs/PHLYD.svg)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/practicantetransfdigital/Protocolo-Higiene-Limpieza-y-Desinfeccion)