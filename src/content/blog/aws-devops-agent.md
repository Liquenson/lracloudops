---
titulo: "Construimos un agente CLI con IA para gestionar AWS en lenguaje natural"
descripcion: "Cómo construimos el AWS DevOps Agent con Claude Sonnet 4.6, boto3 y Python: arquitectura real del agente, 31 herramientas AWS implementadas y las lecciones que no estaban en ningún tutorial."
fecha: 2026-05-05
tags: ["AI", "AWS", "Python", "DevOps", "Claude", "boto3", "Agentes"]
draft: false
---

## El problema que llevó a este proyecto

Hay una pregunta que cualquier ingeniero DevOps se hace varias veces al día: *"¿cómo está la infraestructura ahora mismo?"*. La respuesta implica abrir varias consolas, ejecutar una docena de comandos de AWS CLI, parsear JSON crudo y sintetizar mentalmente el estado de múltiples servicios. Cuando lo haces en una situación de incidente, cada segundo cuenta.

La pregunta que nos hicimos fue directa: ¿podemos reemplazar ese ciclo de comandos por una conversación en lenguaje natural que devuelva una respuesta sintetizada? La respuesta fue el **AWS DevOps Agent** — un agente CLI escrito en Python que usa Claude Sonnet 4.6 como motor de razonamiento y boto3 como capa de ejecución.

Este artículo describe cómo lo construimos, las decisiones técnicas reales que tomamos y lo que aprendimos en el proceso.

## Arquitectura del sistema

El agente tiene tres capas:

```
Usuario (lenguaje natural)
        ↓
Claude Sonnet 4.6 (razonamiento + selección de herramientas)
        ↓
boto3 (ejecución real contra la cuenta AWS)
        ↓
Respuesta sintetizada en español
```

El punto clave es que Claude no ejecuta código de Python directamente — selecciona herramientas definidas como schemas JSON, el agente las ejecuta con boto3, y devuelve los resultados de vuelta a Claude para que los interprete. Este patrón de **tool use** (function calling) es lo que hace al sistema robusto: Claude puede encadenar múltiples herramientas, evaluar los resultados intermedios y decidir si necesita más información antes de responder.

```python
def agente(pregunta):
    messages = [{"role": "user", "content": pregunta}]
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=tools,
            system="Eres un agente DevOps experto en AWS...",
            messages=messages
        )
        if response.stop_reason == "tool_use":
            # Ejecutar cada herramienta solicitada
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    resultado = ejecutar_herramienta(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(resultado, ensure_ascii=False)
                    })
            messages.append({"role": "user", "content": tool_results})
        elif response.stop_reason == "end_turn":
            break
```

El loop continúa mientras Claude necesite ejecutar herramientas. Cuando Claude considera que tiene suficiente información, devuelve la respuesta final y el loop termina.

## Los 31 clientes boto3 y por qué son tantos

La primera decisión fue inicializar todos los clientes boto3 al arrancar el agente, no en cada llamada:

```python
REGION = "eu-west-1"

ec2     = boto3.client("ec2",            region_name=REGION)
s3      = boto3.client("s3")
logs    = boto3.client("logs",           region_name=REGION)
ecs     = boto3.client("ecs",            region_name=REGION)
eks     = boto3.client("eks",            region_name=REGION)
rds     = boto3.client("rds",            region_name=REGION)
lmb     = boto3.client("lambda",         region_name=REGION)
iam     = boto3.client("iam")
ce      = boto3.client("ce",             region_name="us-east-1")
# ... 22 más
gd      = boto3.client("guardduty",      region_name=REGION)
```

La excepción es Cost Explorer (`ce`): este servicio de AWS solo acepta requests desde `us-east-1` independientemente de dónde esté la infraestructura — ese fue el primer gotcha que encontramos. IAM y S3 tampoco requieren región porque son servicios globales.

Los 31 clientes cubren: EC2, S3, RDS, EKS, ECS, Lambda, IAM, Cost Explorer, SNS, SQS, CloudFormation, Route53, CloudWatch, ALB/ELB, ECR, DynamoDB, ElastiCache, SSM, EventBridge, API Gateway, CodePipeline, CodeBuild, CloudFront y GuardDuty.

## Las herramientas más interesantes

### Auditoría de Security Groups

Esta herramienta analiza todos los security groups de la cuenta y detecta reglas con CIDR `0.0.0.0/0` — exposición pública. Clasifica el riesgo según el puerto:

```python
puertos_criticos = [22, 3306, 5432, 27017, 6379, 3389]

for sg in response["SecurityGroups"]:
    for rule in sg.get("IpPermissions", []):
        for ip in rule.get("IpRanges", []):
            if ip.get("CidrIp") == "0.0.0.0/0":
                puerto = rule.get("FromPort", "todos")
                peligrosos.append({
                    "sg_id": sg["GroupId"],
                    "nombre": sg["GroupName"],
                    "puerto": puerto,
                    "riesgo": "ALTO" if puerto in puertos_criticos else "MEDIO"
                })
```

Un puerto 22 (SSH) abierto al mundo es riesgo ALTO. Un puerto 8080 abierto es riesgo MEDIO. Claude toma esta clasificación y la incluye en la respuesta con recomendaciones concretas.

### Rotación de Access Keys IAM

Otra herramienta crítica detecta access keys antiguas:

```python
antiguedad = (datetime.now(k["CreateDate"].tzinfo) - k["CreateDate"]).days
resultado.append({
    "usuario": u["UserName"],
    "key_id": k["AccessKeyId"],
    "estado": k["Status"],
    "antiguedad_dias": antiguedad,
    "riesgo": "ALTO" if antiguedad > 90 else "OK"
})
```

Una key activa con más de 90 días sin rotar es un riesgo de seguridad estándar. El agente puede detectar esto con una sola pregunta: *"¿tenemos access keys antiguas que deberíamos rotar?"*.

### Costes por servicio

Cost Explorer devuelve datos agrupados por servicio del mes en curso:

```python
response = ce.get_cost_and_usage(
    TimePeriod={"Start": inicio, "End": fin},
    Granularity="MONTHLY",
    Metrics=["UnblendedCost"],
    GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
)
```

El resultado se ordena de mayor a menor coste y Claude presenta solo los servicios con coste > $0.01, eliminando el ruido de servicios gratuitos que aparecen en el desglose de AWS.

## Cómo definimos las herramientas para Claude

Cada herramienta tiene un schema JSON que Claude usa para entender cuándo y cómo invocarla:

```python
tools = [
    {
        "name": "revisar_security_groups",
        "description": "Detecta security groups peligrosos abiertos al mundo",
        "input_schema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "ver_logs_cloudwatch",
        "description": "Muestra logs recientes de un grupo CloudWatch",
        "input_schema": {
            "type": "object",
            "properties": {
                "log_group": {"type": "string"},
                "minutos": {"type": "integer"}
            },
            "required": ["log_group"]
        }
    },
    # ... 29 más
]
```

La descripción de cada herramienta es crítica. Claude no lee el código Python — solo lee el `name` y `description`. Si la descripción es ambigua, Claude puede invocar la herramienta incorrecta o no invocarla cuando debería.

El sistema de despacho mapea el nombre de cada herramienta a su función Python:

```python
def ejecutar_herramienta(nombre, inputs):
    mapa = {
        "listar_instancias_ec2":        lambda: listar_instancias_ec2(),
        "parar_instancia":              lambda: parar_instancia(inputs["instance_id"]),
        "ver_logs_cloudwatch":          lambda: ver_logs_cloudwatch(
                                            inputs["log_group"],
                                            inputs.get("minutos", 60)
                                        ),
        # ... 28 más
    }
    fn = mapa.get(nombre)
    return fn() if fn else {"error": f"Herramienta {nombre} no encontrada"}
```

## El prompt del sistema: por qué importa más de lo esperado

El system prompt del agente es más corto de lo que uno esperaría:

```
Eres un agente DevOps experto en AWS con acceso completo a la infraestructura.
Responde siempre en español de forma clara y concisa.
Usa las herramientas para obtener datos reales antes de responder.
Cuando detectes problemas de seguridad sé específico y da recomendaciones concretas.
Cuando muestres costes ordénalos de mayor a menor.
```

La clave es "usa las herramientas para obtener datos reales antes de responder". Sin esta instrucción, Claude puede responder con información de su training data en lugar de consultar la cuenta AWS real. También fue importante especificar el idioma (español) para que tanto las respuestas como los errores sean consistentes.

## Manejo de errores: cuando AWS falla

Cada función boto3 está envuelta en try/except que devuelve un dict con el error en lugar de lanzar una excepción:

```python
def listar_bases_de_datos_rds():
    try:
        response = rds.describe_db_instances()
        # ... procesar
    except Exception as e:
        return [{"error": str(e)}]
```

Esto es importante porque Claude recibe el resultado del tool use como JSON. Si la función lanza una excepción no capturada, el agente se rompe. Si devuelve `{"error": "mensaje"}`, Claude puede interpretarlo y comunicarlo: *"No tengo permisos para listar las instancias RDS. Verifica que las credenciales tengan el permiso `rds:DescribeDBInstances`"*.

## Lecciones aprendidas

**La primera lección fue sobre las descripciones de las herramientas.** Claude infiere cuándo usar cada herramienta basándose en el nombre y descripción, no en el código. Si tienes `listar_instancias_ec2` y `listar_servicios_ecs`, Claude los diferencia correctamente. Pero si tienes dos herramientas con descripciones similares, puede invocar la incorrecta. Tiempo invertido en describir bien las herramientas = menos prompts de corrección.

**La segunda lección fue sobre el volumen de los resultados de AWS.** Algunas APIs como `describe_instances` devuelven objetos JSON enormes con decenas de campos por recurso. Si el agente devuelve todo eso a Claude, agota rápido el context window. La solución fue proyectar solo los campos útiles en cada función Python — el agente extrae `InstanceId`, `InstanceType`, `State`, `PublicIpAddress` y nada más.

**La tercera lección fue sobre Cost Explorer.** Es el único servicio de AWS que exige que el cliente esté en `us-east-1`. Nuestro código original usó `eu-west-1` para todo y Cost Explorer fallaba silenciosamente. Cuando añadiste el try/except y viste el error, fue inmediatamente obvio.

**La cuarta lección fue sobre las acciones destructivas.** El agente puede parar instancias EC2 con la función `parar_instancia`. No implementamos confirmación a nivel de código — la instrucción de confirmación está en el system prompt. Claude la interpreta correctamente: antes de ejecutar `parar_instancia`, pregunta "¿Confirmas que quieres parar la instancia web-prod (i-0abc123)?". Funciona en la práctica, aunque una confirmación a nivel de código sería más robusta para un entorno de producción real.

## Cómo ejecutarlo

El agente necesita credenciales AWS configuradas localmente (`~/.aws/credentials` o variables de entorno) y una API key de Anthropic:

```bash
pip install anthropic boto3 python-dotenv

# .env
ANTHROPIC_API_KEY=sk-ant-...

python agent.py
```

Al arrancar, muestra los servicios disponibles y abre el prompt interactivo. Cada query ejecuta el loop de tool use hasta que Claude tiene suficiente contexto para responder.

## Próximos pasos

El agente actual es stateless — cada sesión comienza desde cero. El siguiente paso natural es persistir el contexto de la sesión para que el agente recuerde operaciones previas entre reinicios. También tenemos en roadmap integración con SNS para que el agente pueda enviar notificaciones directamente cuando detecta problemas.

Si trabajas en proyectos donde la gestión de infraestructura AWS es parte del día a día, o si quieres explorar cómo integrar agentes de IA en tus flujos DevOps, [escríbenos](/contacto) — estamos construyendo esto activamente y nos interesa conocer casos de uso reales.

El código fuente de este proyecto es parte del portafolio de LRA Cloud Operations. Puedes ver la arquitectura completa en la [página del proyecto](/projects/aws-devops-agent).
