---
titulo: "AWS DevOps Agent"
descripcion: "Agente CLI con Claude Sonnet 4.6 y 31 herramientas boto3 para gestionar toda la infraestructura AWS en lenguaje natural. Auditoría de security groups, rotación de IAM keys, análisis de costos, logs CloudWatch y gestión de EC2, ECS, EKS, RDS, Lambda y 20+ servicios adicionales."
fecha: 2026-05-01
categoria: "AI + DevOps"
madurez: "En Desarrollo"
stack: ["Python 3.11", "Claude Sonnet 4.6", "Anthropic SDK", "boto3", "python-dotenv", "AWS", "GuardDuty", "Cost Explorer", "CloudWatch"]
cicd: false
github: null
featured: true
iconPath: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
draft: false
metricas:
  - { label: "Servicios AWS", value: "31+" }
  - { label: "Herramientas Claude", value: "31" }
  - { label: "Idioma", value: "Lenguaje natural" }
  - { label: "Modelo", value: "Claude Sonnet 4.6" }
highlights:
  - "31 clientes boto3 activos: EC2, S3, RDS, EKS, ECS, Lambda, IAM, CloudWatch, ECR, DynamoDB, ElastiCache, SNS, SQS, CloudFormation, Route53, API Gateway, CodePipeline, CodeBuild, CloudFront, SSM, EventBridge, GuardDuty y más"
  - "Auditoría de security groups: detecta puertos críticos abiertos al mundo (22, 3306, 5432, 27017, 6379, 3389) con clasificación de riesgo ALTO/MEDIO"
  - "Rotación de IAM access keys: identifica keys con más de 90 días sin rotar con clasificación automática"
  - "Análisis de costos con Cost Explorer ordenado por servicio: desglosa gasto mensual real en USD"
  - "Logs CloudWatch en tiempo real: últimos N minutos de cualquier log group con timestamps"
  - "Confirmación explícita antes de ejecutar operaciones destructivas (parar/terminar instancias)"
arquitectura:
  - { nombre: "Claude Sonnet 4.6", descripcion: "Modelo de IA que interpreta comandos en lenguaje natural y decide qué herramientas usar" }
  - { nombre: "Tool Use (Function Calling)", descripcion: "20+ herramientas definidas que mapean a operaciones AWS reales via boto3" }
  - { nombre: "boto3", descripcion: "SDK AWS para Python que ejecuta las operaciones en la cuenta real" }
  - { nombre: "Anthropic SDK", descripcion: "Cliente para la API de Claude con manejo de conversación multi-turno" }
  - { nombre: "AWS IAM", descripcion: "Credenciales locales con principio de mínimo privilegio para las operaciones permitidas" }
---

## Descripción del proyecto

AWS DevOps Agent es un experimento en la intersección de IA y operaciones cloud. La idea es simple: en lugar de recordar el comando exacto de AWS CLI o construir queries complejas, simplemente describes lo que quieres hacer en español.

```
Usuario: "¿Cuánto costamos en AWS el mes pasado? Desglosa por servicio."
Agente: [Ejecuta Cost Explorer API] 
        "El mes pasado gastaste $247.50 en total:
         - EC2: $142.30 (57.5%)
         - RDS: $68.20 (27.5%)  
         - CloudFront: $23.40 (9.5%)
         - S3: $13.60 (5.5%)
         
         El mayor incremento fue EC2 (+$23 vs mes anterior). 
         ¿Quieres ver el detalle de qué instancias consumen más?"
```

## Cómo funciona

El agente usa la API de Claude con tool use (function calling). Cada operación AWS posible está definida como una herramienta con su schema JSON.

Cuando el usuario escribe un comando, Claude analiza la intención, selecciona la herramienta apropiada (o secuencia de herramientas), la ejecuta via boto3, obtiene el resultado y formula una respuesta en lenguaje natural con contexto y sugerencias.

El modelo mantiene contexto de la conversación, por lo que puede hacer operaciones dependientes:

```
Usuario: "Lista mis instancias EC2"
→ [Ejecuta describe_instances]
→ "Tienes 3 instancias: web-prod, db-replica, bastion"

Usuario: "Para la bastion"  
→ [Ejecuta stop_instances para la instancia 'bastion']
→ "Instancia bastion (i-0abc123) parada correctamente."
```

## Herramientas implementadas

El agente puede realizar operaciones en más de 25 servicios AWS:

**EC2:** Listar, iniciar, parar instancias; describir security groups; ver métricas CloudWatch.

**S3:** Listar buckets, contar objetos, verificar configuración de acceso público, estimado de costos por bucket.

**RDS:** Listar instancias, estado de réplicas, últimos eventos, tamaño de almacenamiento.

**Lambda:** Listar funciones, ver logs recientes, invocar funciones de prueba.

**EKS:** Estado de clusters y node groups, pods en estado no-Running.

**GuardDuty:** Resumen de findings de seguridad por severidad con explicación en lenguaje simple.

**Cost Explorer:** Costos del período, desglose por servicio, comparativa vs período anterior.

## Seguridad y limitaciones

El agente tiene acceso a la cuenta AWS con las mismas credenciales del sistema. Antes de ejecutar operaciones destructivas (parar instancias, eliminar recursos), pide confirmación explícita.

El contexto de la conversación vive en memoria y no se persiste. Cada sesión comienza desde cero.

## Lessons learned

La mayor sorpresa fue que Claude no necesita instrucciones muy detalladas sobre cada herramienta. Si los nombres y descripciones de las herramientas son claros, el modelo infiere correctamente cuándo usarlas y en qué orden.

El principal desafío fue manejar errores de AWS gracefully: cuando una operación falla (permisos insuficientes, recurso no existe), Claude necesita interpretar el error y comunicarlo de forma útil en lugar de simplemente mostrar el stack trace.

La segunda lección: el límite de contexto importa. Con conversaciones largas que incluyen muchas respuestas de API (que pueden ser voluminosas), es necesario truncar o resumir resultados intermedios para no agotar el context window.
