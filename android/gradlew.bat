@rem Gradle wrapper launcher for SadakSetu
@echo off
set DIR=%~dp0
if defined JAVA_HOME (
  set JAVA_CMD=%JAVA_HOME%\bin\java.exe
) else (
  set JAVA_CMD=java.exe
)
"%JAVA_CMD%" -Xmx64m -Xms64m -classpath "%DIR%gradle\wrapper\gradle-wrapper.jar;%DIR%gradle\wrapper\gradle-wrapper-shared-9.1.0.jar;%DIR%gradle\wrapper\gradle-cli-9.1.0.jar;%DIR%gradle\wrapper\gradle-files-9.1.0.jar;%DIR%gradle\wrapper\gradle-stdlib-java-extensions-9.1.0.jar;%DIR%gradle\wrapper\gradle-client-services-9.1.0.jar;%DIR%gradle\wrapper\failureaccess-1.0.3.jar" org.gradle.wrapper.GradleWrapperMain %*
