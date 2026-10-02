# --- Build stage ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies separately from source so code changes don't re-download the internet.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Pre-create and own the uploads dir *before* switching users and *before* the VOLUME
# instruction — Docker seeds a fresh named volume from whatever's already at that path
# in the image, ownership included. Skip this and the volume mounts in root-owned,
# and the non-root "spring" user below can't write to it.
RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /app/uploads/products \
    && chown -R spring:spring /app/uploads

COPY --from=build /app/target/*.jar app.jar
USER spring:spring

VOLUME /app/uploads

EXPOSE 8080

# JVM sized for small hosts (free plans give ~512 MB): cap the heap well below the container limit so
# metaspace/threads still fit, use the low-memory serial GC, and skip the heavy C2 compiler to start faster.
# Override with a JAVA_OPTS env var on bigger plans.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=55 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
