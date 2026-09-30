# GEA - Frontend Platform

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Shadcn/UI](https://img.shields.io/badge/Shadcn%2FUI-000000?style=flat&logo=shadcnui&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat&logo=axios&logoColor=white)
![Estado](https://img.shields.io/badge/Estado-Completado-2EA44F?style=flat)

**GEA (Gestión de Eventos y Anuncios)** es una plataforma institucional para la gestión de eventos, calendarios, espacios físicos, reservas y anuncios públicos.

Este repositorio contiene el **frontend web de GEA**, desarrollado con **React**, encargado de proporcionar la interfaz de administración para la gestión de los diferentes recursos de la plataforma y de comunicarse con el backend mediante una API REST.

GEA fue desarrollado como un **proyecto real para una institución universitaria**. La plataforma web, junto con el backend y la aplicación móvil, fue diseñada, estructurada y programada de forma individual.

---

## 📑 Tabla de contenido

- [Características principales](#-características-principales)
- [Arquitectura](#️-arquitectura)
- [Stack tecnológico](#-stack-tecnológico)
- [Autenticación y seguridad](#-autenticación-y-seguridad)
- [Integración con el backend](#-integración-con-el-backend)
- [Requisitos](#-requisitos)
- [Instalación y ejecución local](#️-instalación-y-ejecución-local)
- [Compilación para producción](#-compilación-para-producción)
- [Calidad y linting](#-calidad-y-linting)
- [Estructura del proyecto](#️-estructura-del-proyecto)
- [Ecosistema GEA](#-ecosistema-gea)
- [Entornos](#-entornos)
- [Estado del proyecto](#-estado-del-proyecto)
- [Desarrollo](#-desarrollo)
- [Propiedad y uso](#-propiedad-y-uso)
- [Autor](#-autor)

---

## 🚀 Características principales

- **Gestión de eventos:** consulta, administración y seguimiento de eventos institucionales.
- **Gestión de anuncios:** administración y publicación de información institucional.
- **Gestión de espacios físicos:** consulta y administración de lugares disponibles.
- **Gestión de reservas:** interacción con las funcionalidades de reservas proporcionadas por el backend.
- **Autenticación de usuarios:** inicio de sesión mediante las credenciales gestionadas por el backend.
- **Control de acceso:** visualización de funcionalidades según los permisos y roles del usuario.
- **Navegación protegida:** protección de rutas que requieren autenticación.
- **Comunicación con API REST:** integración con el backend mediante Axios.
- **Interfaz responsive:** adaptación de la plataforma a diferentes tamaños de pantalla.
- **Componentes reutilizables:** estructura basada en componentes para facilitar el mantenimiento.
- **Validación de formularios:** validación de datos antes de enviarlos al backend.
- **Sistema de diseño:** componentes construidos con Shadcn/UI y Lucide Icons.

---

## 🏗️ Arquitectura

El frontend está estructurado siguiendo una organización modular basada en componentes, páginas, servicios y hooks.

Esta estructura permite separar las responsabilidades de la interfaz de usuario, la gestión del estado, la comunicación con el backend y las utilidades de la aplicación.

```text
GEA_FRONT/
│
├── public/
│   └── Archivos y recursos estáticos
│
├── src/
│   ├── assets/
│   │   └── Recursos gráficos
│   │
│   ├── components/
│   │   └── Componentes UI reutilizables
│   │
│   ├── context/
│   │   └── Estados globales y autenticación
│   │
│   ├── hooks/
│   │   └── Custom React Hooks
│   │
│   ├── pages/
│   │   └── Vistas principales de la aplicación
│   │
│   ├── services/
│   │   └── Comunicación con la API REST
│   │
│   └── utils/
│       └── Utilidades y validaciones
│
├── .env.example
├── package.json
└── vite.config.js
```

### Flujo general de comunicación

```text
Usuario
   │
   ▼
Interfaz React
   │
   ▼
Pages / Components
   │
   ▼
Services / Axios
   │
   ▼
GEA Backend
   │
   ▼
REST API
```

El frontend consume los endpoints proporcionados por el backend y utiliza la información recibida para representar y administrar los diferentes módulos de la plataforma.

---

## 🧰 Stack tecnológico

| Tecnología | Uso |
|---|---|
| React 19 | Desarrollo de la interfaz |
| Vite | Herramienta de desarrollo y build |
| JavaScript | Lenguaje principal |
| Axios | Comunicación con la API REST |
| React Router DOM | Enrutamiento de la aplicación |
| Shadcn/UI | Componentes y sistema de interfaz |
| Lucide Icons | Iconografía |
| CSS | Estilos y personalización visual |
| ESLint | Análisis y calidad del código |
| npm | Gestión de dependencias |

---

## 🔐 Autenticación y seguridad

La plataforma web utiliza el sistema de autenticación proporcionado por el backend de GEA.

El flujo general es:

```text
Usuario
   │
   ▼
Formulario de Login
   │
   ▼
GEA Backend
   │
   ▼
Validación de credenciales
   │
   ▼
JWT
   │
   ▼
Frontend
   │
   ▼
Acceso a rutas protegidas
```

### Implementación

- Autenticación mediante JWT
- Gestión del estado de autenticación mediante `AuthContext`
- Protección de rutas privadas
- Envío del token mediante solicitudes HTTP
- Control de acceso según la información proporcionada por el backend
- Configuración de la URL de la API mediante variables de entorno

La autenticación y la autorización son gestionadas por el backend, mientras que el frontend administra la experiencia de inicio de sesión y el acceso a las diferentes vistas de la plataforma.

---

## 🔗 Integración con el backend

El frontend se comunica con **GEA Backend** mediante una API REST.

La URL del backend se configura mediante una variable de entorno:

```env
VITE_API_URL=http://localhost:8083
```

Esto permite utilizar diferentes instancias del backend según el entorno de ejecución, sin modificar directamente el código de la aplicación.

---

## 📋 Requisitos

Para ejecutar el proyecto localmente se requiere:

- Node.js
- npm
- Git

Se recomienda utilizar una versión de Node.js compatible con React 19 y con las dependencias definidas en `package.json`.

---

## ⚙️ Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/x6Darck/Front_gea.git
cd Front_gea
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`:

```env
VITE_API_URL=http://localhost:8083
```

Configura la URL correspondiente a la instancia del backend que deseas utilizar.

> [!IMPORTANT]
> Los archivos `.env` con configuraciones privadas no deben subirse al repositorio.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La plataforma estará disponible normalmente en:

```text
http://localhost:5173
```

---

## 📦 Compilación para producción

Para generar una versión optimizada para producción:

```bash
npm run build
```

El proceso generará la carpeta:

```text
dist/
```

Los archivos generados pueden ser servidos mediante servidores web como **Nginx**, Apache o plataformas de hosting para aplicaciones estáticas.

Para probar localmente la versión de producción:

```bash
npm run preview
```

---

## 🧪 Calidad y linting

El proyecto utiliza **ESLint** para detectar problemas potenciales y mantener una estructura consistente en el código.

Para ejecutar el análisis:

```bash
npm run lint
```

Se recomienda ejecutar el proceso de linting antes de integrar nuevos cambios al proyecto.

---

## 🗂️ Estructura del proyecto

```text
Front_gea/
│
├── public/
│   └── Recursos estáticos
│
├── src/
│   ├── assets/
│   │   └── Imágenes y recursos gráficos
│   │
│   ├── components/
│   │   └── Componentes reutilizables
│   │
│   ├── context/
│   │   └── Contextos globales
│   │
│   ├── hooks/
│   │   └── Custom Hooks
│   │
│   ├── pages/
│   │   └── Vistas principales
│   │
│   ├── services/
│   │   └── Servicios y comunicación con la API
│   │
│   └── utils/
│       └── Funciones auxiliares y validaciones
│
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

---

## 🔄 Ecosistema GEA

El frontend forma parte de un ecosistema compuesto por tres aplicaciones principales.

### ⚙️ GEA Backend

API REST desarrollada con **Java y Spring Boot**, encargada de la lógica de negocio, la persistencia, la autenticación, la autorización y la comunicación con la base de datos.

**Tecnologías principales:**

- Java 21
- Spring Boot
- Spring Security
- JWT
- Spring Data JPA
- MySQL
- Hibernate Envers
- Swagger / OpenAPI

**Repositorio:** [github.com/x6Darck/Backend_gea](https://github.com/x6Darck/Backend_gea)

### 📱 GEA Mobile

Aplicación móvil desarrollada con **Flutter** para la consulta de eventos, calendario y anuncios institucionales.

La aplicación utiliza **Clean Architecture**, Riverpod para la gestión de estado y Dio para la comunicación con el backend.

**Tecnologías principales:**

- Flutter
- Dart
- Riverpod
- Dio
- GoRouter
- Flutter Secure Storage
- Shared Preferences

**Repositorio:** [github.com/x6Darck/Movil_gea](https://github.com/x6Darck/Movil_gea)

### 🔄 Comunicación entre aplicaciones

```text
                ┌───────────────────┐
                │   GEA Frontend    │
                │       React       │
                └─────────┬─────────┘
                          │
                          │ REST API
                          │
                ┌─────────▼─────────┐
                │                   │
                │    GEA Backend    │
                │    Spring Boot    │
                │                   │
                └─────────┬─────────┘
                          │
                          │ JPA
                          │
                ┌─────────▼─────────┐
                │       MySQL       │
                └───────────────────┘
                          ▲
                          │
                          │ REST API
                          │
                ┌─────────┴─────────┐
                │                   │
                │    GEA Mobile     │
                │      Flutter      │
                │                   │
                └───────────────────┘
```

El backend funciona como punto central de comunicación entre la plataforma web, la aplicación móvil y la base de datos.

---

## 🌐 Entornos

La plataforma está preparada para trabajar con diferentes instancias del backend según el entorno utilizado.

```text
Desarrollo / Pruebas / Producción
               │
               ▼
          GEA Backend
               │
               ▼
          GEA Frontend
```

La URL correspondiente a cada entorno se configura mediante variables de entorno, evitando modificar directamente el código fuente.

---

## 📌 Estado del proyecto

**Estado:** Completado

GEA fue desarrollado como un proyecto real para una institución universitaria, contemplando una plataforma web, una aplicación móvil y una API REST centralizada.

---

## 👨‍💻 Desarrollo

GEA fue **diseñado, estructurado y desarrollado de forma individual**, incluyendo:

- Diseño y desarrollo de la interfaz web
- Arquitectura y organización del frontend
- Desarrollo de componentes reutilizables
- Implementación del sistema de navegación
- Implementación del flujo de autenticación
- Integración con la API REST
- Gestión del estado de autenticación
- Validación de formularios
- Diseño y adaptación de la interfaz
- Integración con los diferentes módulos del sistema
- Integración con el backend y la aplicación móvil

El frontend fue desarrollado con un enfoque orientado a la **reutilización de componentes, mantenibilidad, separación de responsabilidades y consistencia visual**.

---

## 📄 Propiedad y uso

GEA es un proyecto desarrollado para una institución universitaria como parte de un proyecto real de desarrollo de software.

Este repositorio se presenta con fines demostrativos y de **portafolio profesional**. La publicación del proyecto no implica la transferencia de derechos de propiedad intelectual ni autorización para copiar, modificar, distribuir o utilizar el software con fines comerciales.

Los derechos sobre el proyecto, sus componentes y materiales asociados corresponden a las partes que hayan sido establecidas en los acuerdos del proyecto.

El repositorio no incluye:

- Credenciales
- Contraseñas
- Datos personales
- Información sensible
- Configuraciones privadas
- Secretos de autenticación

---

## 👤 Autor

**Jean Pier Gómez**

Desarrollo individual del ecosistema GEA.

---

<p align="center">
  <strong>GEA — Gestión de Eventos y Anuncios</strong><br>
  Sistema institucional desarrollado con Java, Spring Boot, React y Flutter.
</p>
