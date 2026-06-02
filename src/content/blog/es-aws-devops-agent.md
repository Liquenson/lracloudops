---
titulo: "Construyendo un Agente AWS de Operaciones con Lenguaje Natural usando Claude y boto3"
descripcion: "Arquitectura del AWS DevOps Agent: Claude Sonnet 4.6 como capa de razonamiento, 31 herramientas boto3 como capa de ejecución, y las decisiones de ingeniería que determinan si un agente con uso de herramientas es operacionalmente útil."
fecha: 2026-05-05
tags: ["AI", "AWS", "Python", "DevOps", "Claude", "boto3", "Agentes"]
draft: false
---

## Problema

Responder a la pregunta "¿cuál es el estado actual de la infraestructura?" requiere abrir múltiples consolas, ejecutar una docena de comandos AWS CLI, parsear JSON crudo y sintetizar mentalmente el estado de múltiples servicios. En condiciones normales esto lleva minutos. Durante un incidente, esos minutos tienen un coste operacional real.

La pregunta era si una interfaz en lenguaje natural sobre las APIs de AWS podía reducir esa carga operacional — no como sustituto para comprender la infraestructura, sino como forma de consultarla sin cambiar de contexto entre múltiples herramientas.

## Contexto

El AWS DevOps Agent es una herramienta CLI escrita en Python que usa Claude Sonnet 4.6 como capa de razonamiento y boto3 como capa de ejecución. Un usuario escribe una pregunta en lenguaje natural. Claude selecciona qué operaciones AWS ejecutar, el agente las ejecuta via boto3, y Claude sintetiza los resultados en una respuesta estructurada.

La restricción arquitectónica que hace esto útil en lugar de una demo: Claude no ejecuta Python directamente. Selecciona herramientas definidas como esquemas JSON, el agente las ejecuta y devuelve los resultados a Claude para interpretación. Este patrón de uso de herramientas permite a Claude encadenar múltiples operaciones, evaluar resultados intermedios y decidir si se necesitan datos adicionales antes de responder.

## Arquitectura

Tres capas:

```
Usuario (lenguaje natural)
        ↓
Claude Sonnet 4.6 (razonamiento + selección de herramientas)
        ↓
boto3 (ejecución contra la cuenta AWS)
```

La primera capa recibe la entrada del usuario y construye el contexto del sistema. La segunda selecciona herramientas, las encadena y sintetiza resultados. La tercera ejecuta llamadas AWS reales y devuelve datos estructurados.

## Herramientas

El agente expone 31 herramientas boto3 organizadas por dominio de servicio: EC2 (instancias, grupos de seguridad, VPCs), EKS (clusters, grupos de nodos, pods via kubectl), ECS (clusters, servicios, tareas), RDS (instancias, snapshots, parámetros), IAM (usuarios, roles, políticas), S3 (buckets, objetos, configuración), y herramientas transversales de facturación y CloudWatch.

Cada herramienta tiene un esquema JSON que incluye nombre, descripción, y definición de parámetros. La descripción determina cuándo Claude selecciona la herramienta. Una descripción imprecisa genera selecciones erróneas — el problema de alineación más frecuente al depurar agentes de uso de herramientas.

## Flujo de ejecución

```python
while True:
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        tools=tools,
        messages=messages
    )
    
    if response.stop_reason == "end_turn":
        break
    
    if response.stop_reason == "tool_use":
        tool_results = execute_tools(response.content)
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
```

El bucle continúa hasta que Claude devuelve `end_turn` — lo que significa que ha sintetizado suficiente información para responder. Puede llamar a múltiples herramientas en una sola respuesta, y puede encadenar llamadas a través de múltiples turnos.

## Decisiones de diseño

**Por qué no ejecutar Python directamente.** El patrón de uso de herramientas impone un límite de confianza. Claude define qué ejecutar, el agente ejecuta, el agente devuelve resultados. Si Claude pudiera ejecutar código arbitrario, el agente requeriría sandboxing, gestión de permisos y aislamiento de efectos secundarios. Las herramientas boto3 de solo lectura eliminan esa superficie.

**Por qué 31 herramientas específicas en lugar de una interfaz genérica.** Una herramienta genérica boto3 ("ejecuta cualquier llamada SDK") requeriría que Claude generara código Python correcto para cada consulta. Las herramientas específicas trasladan la responsabilidad del código correcto al agente y dejan a Claude hacer razonamiento. Los errores de herramientas son recuperables; los errores de razonamiento no lo son en tiempo de ejecución.

**Gestión de contexto.** AWS devuelve respuestas grandes. Un solo `describe_instances` puede devolver varios KB de JSON por instancia. El agente filtra campos innecesarios antes de pasarlos a Claude para mantener la ventana de contexto manejable a través de conversaciones largas.

## Limitaciones

El agente está diseñado para operaciones de solo lectura. No se incluyen herramientas de mutación — no hay `terminate_instance`, no hay `delete_bucket`. Esta es una restricción de diseño deliberada: el agente útil para operaciones es distinto del agente de remediación automatizada, y colapsar ambos en un solo sistema requiere controles de autorización que están fuera del alcance de este proyecto.

La latencia es real. Una consulta típica multi-servicio tarda 3–8 segundos: tiempo de red boto3 más latencia de la API Claude. Esto es aceptable para preguntas de estado pero no para monitorización.

## Conclusión

El valor del agente no está en los LLMs o en las APIs de AWS — ambas están bien documentadas. El valor está en el patrón: una interfaz de lenguaje natural que preserva la trazabilidad (cada operación es boto3 con un propósito, no código generado), está acotada (31 herramientas, no un intérprete de propósito general) y es recuperable (los errores de herramientas son mensajes de error que Claude puede manejar, no fallos de Python que colapsan el proceso).
