---
titulo: "Linux Fleet Manager"
descripcion: "Framework de automatización Bash v2.1.0 para gestionar flotas de servidores Linux a escala. Genera inventarios en CSV y JSON con CI/CD multi-plataforma validado con ShellCheck en Ubuntu, macOS y Windows."
fecha: 2026-05-01
categoria: "SRE & Automatización"
madurez: "Producción"
stack: ["Bash 4.0+", "ShellCheck", "SSH", "CSV / JSON", "GitHub Actions", "Ubuntu", "macOS"]
cicd: true
github: "https://github.com/Liquenson/linux-fleet-manager"
featured: false
iconPath: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
draft: false
metricas:
  - { label: "Plataformas CI", value: "3" }
  - { label: "Formatos salida", value: "CSV + JSON" }
  - { label: "Versión actual", value: "v2.1.0" }
  - { label: "Validación", value: "ShellCheck 0 errores" }
highlights:
  - "Inventario automático: hostname, IP, OS, kernel, CPU y timestamp en un solo script"
  - "Exportación dual CSV/JSON lista para importar en CMDB, dashboards o hojas de cálculo"
  - "CI/CD multi-plataforma: ShellCheck en Ubuntu, macOS y Windows Git Bash en paralelo"
  - "Biblioteca reutilizable lib/common.sh con logging estructurado y colores en terminal"
  - "Configuración via templates: config/servers.ini.example y variables.env.example"
  - "Reportes con timestamp automático en reports/ para trazabilidad histórica de la flota"
arquitectura:
  - { nombre: "server-inventory.sh", descripcion: "Script principal que recopila datos del sistema local o via SSH en hosts remotos" }
  - { nombre: "lib/common.sh", descripcion: "Biblioteca de funciones: colores de terminal, logging, manejo de errores reutilizable" }
  - { nombre: "lib/logger.sh", descripcion: "Sistema de logging estructurado con niveles INFO, WARN y ERROR" }
  - { nombre: "ShellCheck CI", descripcion: "Análisis estático de scripts Bash en tres sistemas operativos en paralelo en GitHub Actions" }
  - { nombre: "reports/", descripcion: "Directorio de salida con inventarios timestamped: server-inventory_TIMESTAMP.(csv|json)" }
---

## Descripción del proyecto

Linux Fleet Manager es un framework de automatización Bash diseñado para ingenieros de sistemas y SREs que necesitan mantener visibilidad sobre flotas de servidores Linux sin depender de herramientas SaaS externas ni de agentes instalados en cada host.

El proyecto nació de una necesidad práctica: cuando gestionas docenas o cientos de servidores, necesitas saber rápidamente qué tienes, en qué estado está y cómo ha cambiado con el tiempo. Un script Bash bien construido puede hacer esto sin dependencias externas, sin costos de licencia y ejecutándose en cualquier entorno con acceso SSH.

## El problema que resuelve

En entornos enterprise, los equipos de operaciones frecuentemente enfrentan preguntas como:
- ¿Cuántos servidores tenemos exactamente en producción?
- ¿Qué versión de kernel ejecuta cada host?
- ¿Hay diferencias de configuración entre servidores del mismo rol?

Sin una herramienta de inventario, responder estas preguntas requiere acceso manual a cada servidor. Con Linux Fleet Manager, el inventario completo se genera con un solo comando.

## Arquitectura técnica

El diseño sigue el principio UNIX de hacer una cosa bien. El script principal (`server-inventory.sh`) orquesta la recolección de datos y delega toda la lógica reutilizable — logging, formateo, manejo de errores — a la biblioteca `lib/common.sh`.

La salida puede ser CSV para importar en Excel o Google Sheets, o JSON para procesamiento programático, integración con APIs o ingesta en sistemas de monitoreo.

```bash
# Inventario local en CSV
./scripts/inventory/server-inventory.sh --format csv

# Inventario local en JSON
./scripts/inventory/server-inventory.sh --format json
```

Los reportes se escriben automáticamente en `reports/` con timestamp en el nombre del archivo, creando un historial trazable de cambios en la flota a lo largo del tiempo.

## Pipeline CI/CD multi-plataforma

El pipeline de GitHub Actions ejecuta ShellCheck en paralelo en tres sistemas operativos: Ubuntu, macOS y Windows Git Bash. Esto garantiza que los scripts funcionen en cualquier entorno donde pueda ejecutarse Bash 4.0+.

ShellCheck analiza los scripts sin ejecutarlos, detectando errores comunes: variables sin quoting correcto, uso incorrecto de arrays, comandos que pueden fallar silenciosamente. El pipeline falla con cero tolerancia si ShellCheck encuentra cualquier warning.

## Extensibilidad del framework

La arquitectura modular permite añadir nuevas capacidades sin modificar el código existente. El roadmap incluye:

- **Health checks en paralelo:** Verificar conectividad SSH, espacio en disco y carga de CPU en toda la flota simultáneamente
- **Gestión de usuarios:** Crear/eliminar usuarios y gestionar claves SSH de forma masiva
- **Parches de seguridad:** Aplicar actualizaciones en grupos de servidores con control de rollout
- **Verificación de backups:** Confirmar que los backups recientes existen y son válidos en todos los hosts

## Lessons learned

La mayor lección fue sobre compatibilidad cross-platform. Bash en macOS usa Bash 3.2 por razones de licencia, que tiene diferencias significativas con Bash 4.0+ de Linux. Testar en CI con tres sistemas operativos detectó problemas de compatibilidad antes de que llegaran a producción.

La segunda lección: el logging estructurado desde el inicio ahorra tiempo de diagnóstico. Cuando un script falla en un servidor remoto a las 3am, tener logs con timestamp, nivel y contexto hace la diferencia entre un diagnóstico de 5 minutos y uno de 30.
