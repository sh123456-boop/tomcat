# Tomcat + Spring MVC + JDBC(Hikari) Benchmark Server

This project implements the **Tomcat + Spring MVC + JDBC(Hikari)** variant for benchmark comparison.
It is designed to run against external MySQL (AWS RDS), with no DB container.

## Stack

- Java 21
- Spring Boot 3.x
- Spring MVC (`spring-boot-starter-web`)
- JDBC + Hikari (`spring-boot-starter-jdbc`)
- MySQL driver (`mysql-connector-j`)
- Gradle Wrapper + `bootJar`

## API Spec

### 1) GET `/api/v1/ping`
Response:

```json
{"ok":true}
```

### 2) GET `/api/v1/io/db/read?id=123&sleepMs=80`
Behavior:
1. `SELECT SLEEP(:sec)` where `sec = sleepMs / 1000.0`
2. `SELECT id, payload, cnt FROM bench_items WHERE id = :id`

Response:

```json
{"id":123,"payload":"...","cnt":0,"sleptMs":80}
```

### 3) POST `/api/v1/io/db/tx?sleepMs=30`
Body:

```json
{"id":123,"delta":1}
```

Behavior (transaction):
1. (optional) `SELECT SLEEP(:sec)`
2. `UPDATE bench_items SET cnt = cnt + :delta WHERE id = :id`
3. `SELECT cnt FROM bench_items WHERE id = :id`
4. commit

Response:

```json
{"id":123,"cnt":10,"delta":1,"sleptMs":30}
```

## Environment Variables

Required:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

Optional Hikari tuning:
- `DB_POOL_MAX` (default: `50`)
- `DB_POOL_MIN` (default: `50`)
- `DB_CONN_TIMEOUT_MS` (default: `2000`)

## Build

```bash
./gradlew clean bootJar
```

## Run (local)

```bash
DB_HOST=... DB_PORT=3306 DB_NAME=bench DB_USER=... DB_PASS=... ./gradlew bootRun
```

## Docker

Build image:

```bash
docker build -t tomcat-bench:latest .
```

### Unified run example (important)

```bash
docker run --rm -p 8080:8080 --cpus=1 --memory=1g --memory-swap=1g \
  -e DB_HOST=... -e DB_PORT=3306 -e DB_NAME=bench -e DB_USER=... -e DB_PASS=... \
  -e DB_POOL_MAX=50 -e DB_POOL_MIN=50 \
  -e JAVA_OPTS="-Xms512m -Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+ExitOnOutOfMemoryError" \
  <image>
```

## Monitoring (Prometheus + Grafana)

`/actuator/prometheus` 메트릭을 Prometheus가 수집하고, Grafana에서 시각화할 수 있습니다.

1. 애플리케이션 실행 (`8080` 포트)

```bash
./gradlew bootRun
```

2. 모니터링 스택 실행

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

3. 접속
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (기본 계정 `admin` / `admin`)

## Project Tree

```text
.
├── Dockerfile
├── .dockerignore
├── README.md
├── build.gradle
├── settings.gradle
├── gradlew
├── gradlew.bat
├── gradle/
│   └── wrapper/
└── src/
    ├── main/
    │   ├── java/com/example/tomcat/
    │   │   ├── TomcatApplication.java
    │   │   ├── bench/api/BenchController.java
    │   │   ├── bench/service/BenchService.java
    │   │   ├── bench/repository/BenchRepository.java
    │   │   ├── bench/model/BenchItem.java
    │   │   ├── bench/model/PingResponse.java
    │   │   ├── bench/model/DbReadResponse.java
    │   │   ├── bench/model/TxRequest.java
    │   │   ├── bench/model/TxResponse.java
    │   │   └── common/GlobalExceptionHandler.java
    │   └── resources/application.yml
    └── test/java/com/example/tomcat/TomcatApplicationTests.java
```
