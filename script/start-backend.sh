#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/musicvoting/backend"

# The backend is compiled for Java 25 (maven.compiler.release in pom.xml). An older JDK fails
# late with "UnsupportedClassVersionError", e.g. when an IDE terminal sets JAVA_HOME to its own
# project SDK. So check first, and fall back to SDKMAN's default JDK if that one is new enough.
REQUIRED_JAVA=25

# Prints the major version of the JDK in $1, or 0 if there is no usable java there.
java_major() {
  v=$("$1/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -n 1) || true
  echo "${v:-0}"
}

if [ -z "${JAVA_HOME:-}" ] || [ "$(java_major "$JAVA_HOME")" -lt "$REQUIRED_JAVA" ]; then
  SDKMAN_JAVA="$HOME/.sdkman/candidates/java/current"
  if [ -x "$SDKMAN_JAVA/bin/java" ] && [ "$(java_major "$SDKMAN_JAVA")" -ge "$REQUIRED_JAVA" ]; then
    echo "JAVA_HOME (${JAVA_HOME:-unset}) is older than Java $REQUIRED_JAVA, using $SDKMAN_JAVA"
    JAVA_HOME="$SDKMAN_JAVA"
  else
    echo "Java $REQUIRED_JAVA or newer is required, but JAVA_HOME is '${JAVA_HOME:-unset}'." >&2
    echo "Set JAVA_HOME to a JDK $REQUIRED_JAVA, e.g. JAVA_HOME=/path/to/jdk-25 ./script/start.sh" >&2
    exit 1
  fi
fi
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

cd "$BACKEND_DIR"
echo "Starting backend (Quarkus dev mode, Java $(java_major "$JAVA_HOME"))..."
exec ./mvnw quarkus:dev
