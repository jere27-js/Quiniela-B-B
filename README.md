# 🌍 Quiniela Mundialista B&B — Copa del Mundo 2026

Aplicación web completa para la quiniela del Mundial 2026 de **Productos B&B**.

## 🚀 Características

- **Registro e inicio de sesión** — El usuario crea su cuenta al llenar el formulario por primera vez.
- **Predicciones por grupo** — Formulario responsive organizado por grupo (A–L), con 6 partidos por grupo (72 partidos totales).
- **Bloqueo 24 horas antes** — Las predicciones se cierran automáticamente 24 horas antes del inicio de cada partido. No se puede modificar después.
- **Tabla de posiciones en tiempo real** — Rankings con puntos actualizados automáticamente.
- **Copa animada** — Cada usuario ve su propia Copa del Mundo que se llena con color según sus puntos acumulados.
- **Panel de administrador** — Para ingresar los resultados reales de cada partido.
- **Totalmente responsive** — Diseñado para funcionar perfectamente en teléfonos móviles.
- **Colores corporativos B&B** — Azul profundo (#003087) y dorado (#F5A623).

## 📊 Sistema de puntuación

| Resultado | Puntos |
|-----------|--------|
| 🎯 Resultado exacto (ej: predice 2-1, sale 2-1) | **3 pts** |
| ✅ Ganador/empate correcto sin marcador exacto | **1 pt** |
| ❌ Predicción incorrecta | **0 pts** |

## 🛠️ Instalación y uso

### Requisitos
- Node.js 18+

### Pasos

```bash
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`

### Variables de entorno (opcionales)

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor | `3000` |
| `SESSION_SECRET` | Secreto para sesiones | auto-generado |
| `ADMIN_PASSWORD` | Contraseña del panel admin | `QuinielaBB2026!` |

## 📱 Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio — Registro e inicio de sesión |
| `/quiniela.html` | Formulario de predicciones por grupo |
| `/leaderboard.html` | Tabla de posiciones + Copa animada |
| `/admin.html` | Panel de administración (requiere contraseña) |

## 🏆 Copa del Mundo 2026

72 partidos de fase de grupos: 12 grupos (A–L) con 4 equipos cada uno.
Los partidos comienzan el **11 de junio de 2026**.
