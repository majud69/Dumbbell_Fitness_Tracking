/**
 * ESP8266 Combined RFID + MPU6050 Fitness Tracker
 * 
 * 3-Tap Workflow:
 * TAP 1: Login/Authentication
 * TAP 2: Start Exercise (MPU6050 active)  
 * TAP 3: End Session (Send batch data to server)
 * 
 * Features:
 * - RFID authentication with 3-state workflow
 * - MPU6050 motion tracking for dumbbell exercises
 * - Automatic set detection (30s inactivity)
 * - Batch data transmission on session end
 * - Same RFID card validation for session control
 * 
 * Hardware:
 * - ESP8266 (NodeMCU, Wemos D1 Mini, etc.)
 * - MFRC522 RFID Reader  
 * - MPU6050 Accelerometer/Gyroscope
 * 
 * Connections:
 * MFRC522      ESP8266      MPU6050     ESP8266
 * RST          GPIO0        VCC         3.3V
 * SDA(SS)      GPIO2        GND         GND  
 * MOSI         GPIO13       SCL         D1 (GPIO5)
 * MISO         GPIO12       SDA         D2 (GPIO4)
 * SCK          GPIO14
 * GND          GND
 * 3.3V         3.3V
 */

#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <MPU6050.h>
#include <EEPROM.h>

// RFID Scanner pins
#define RST_PIN 0   // GPIO0 (D3 on NodeMCU)
#define SS_PIN 2    // GPIO2 (D4 on NodeMCU)

// MPU6050 uses I2C: SCL=GPIO5 (D1), SDA=GPIO4 (D2)

// Network Configuration
const char* ssid = "RINANDA";
const char* password = "Fadil12345";
const char* serverUrl = "http://192.168.100.236/prototipe/api";

// Create instances
ESP8266WebServer server(80);
MFRC522 rfid(SS_PIN, RST_PIN);
MPU6050 mpu;

// RFID State Machine
enum RFIDState {
  IDLE,           // Waiting for first tap
  LOGGED_IN,      // User logged in, waiting for start
  EXERCISING,     // Active workout session
  SENDING_DATA    // Sending data to server
};

RFIDState currentState = IDLE;

// Session variables
String currentSessionId = "";
String currentUserId = "";
String sessionRfidId = "";  // RFID that started the session
float currentWeight = 0.0;
unsigned long sessionStartTime = 0;

// RFID scanning variables
String lastScannedRfid = "";
unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 2000; // 2 seconds between scans

// MPU6050 variables
float accelOffsetX = 0, accelOffsetY = 0, accelOffsetZ = 0;
float gyroOffsetX = 0, gyroOffsetY = 0, gyroOffsetZ = 0;
float pitch = 0;
float alpha = 0.96; // Complementary filter coefficient

// Exercise tracking variables
int currentSet = 1;
int currentReps = 0;
int totalReps = 0;
int totalSets = 0;
bool isUp = false;
bool mpuActive = false;

// Timing variables
const unsigned long sampleInterval = 20; // 50Hz sampling for MPU
const unsigned long setTimeout = 30000;  // 30 seconds to end set
const float pitchThreshold = 15.0;       // degrees for rep detection
const float noiseThreshold = 0.5;        // degrees for noise filtering
const float timeConstant = 0.02;         // dt for integration

unsigned long lastSampleTime = 0;
unsigned long lastRepTime = 0;
unsigned long lastMovementTime = 0;

// EEPROM addresses for MPU calibration
const int EEPROM_ACCEL_X = 0;
const int EEPROM_ACCEL_Y = 4;
const int EEPROM_ACCEL_Z = 8;
const int EEPROM_GYRO_X = 12;
const int EEPROM_GYRO_Y = 16;
const int EEPROM_GYRO_Z = 20;
const int EEPROM_MAGIC = 24;

// Sensor data structure
struct SensorData {
  float accelX, accelY, accelZ;
  float gyroX, gyroY, gyroZ;
  float temperature;
};

void setup() {
  Serial.begin(115200);
  Serial.println("\nESP8266 Combined RFID + MPU6050 Fitness Tracker");
  Serial.println("3-Tap Workflow: Login → Start Exercise → End Session");

  // Initialize I2C for MPU6050
  Wire.begin(4, 5); // SDA=GPIO4 (D2), SCL=GPIO5 (D1)
  
  // Initialize EEPROM
  EEPROM.begin(512);
  
  // Initialize SPI for RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID Scanner initialized");
  
  // Initialize MPU6050
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("MPU6050 connection successful");
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
    mpu.setDLPFMode(MPU6050_DLPF_BW_42);
    loadMPUCalibration();
  } else {
    Serial.println("MPU6050 connection failed!");
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server
  setupServerRoutes();
  server.begin();
  
  Serial.println("System ready!");
  Serial.print("Web interface: http://");
  Serial.println(WiFi.localIP());
  Serial.println("\n=== RFID Workflow ===");
  Serial.println("TAP 1: Login/Authentication");
  Serial.println("TAP 2: Start Exercise");
  Serial.println("TAP 3: End Session");
  Serial.println("====================");
}

void loop() {
  // Handle web server requests
  server.handleClient();
  
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }
  
  // Handle RFID scanning
  handleRFIDScanning();
  
  // Handle MPU6050 motion tracking (only when exercising)
  if (currentState == EXERCISING && mpuActive) {
    handleMotionTracking();
  }
  
  // Handle serial commands
  if (Serial.available()) {
    handleSerialCommands();
  }
  
  delay(10);
}

void handleRFIDScanning() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  String cardId = getCardIdString();
  unsigned long currentTime = millis();
  
  // Check scan cooldown
  if (cardId == lastScannedRfid && (currentTime - lastScanTime < scanCooldown)) {
    Serial.println("Scan cooldown active - ignoring");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  lastScannedRfid = cardId;
  lastScanTime = currentTime;
  
  Serial.print("RFID Scanned: ");
  Serial.print(cardId);
  Serial.print(" | State: ");
  Serial.println(getStateString());
  
  // Handle based on current state
  switch (currentState) {
    case IDLE:
      handleLoginTap(cardId);
      break;
      
    case LOGGED_IN:
      handleStartTap(cardId);
      break;
      
    case EXERCISING:
      handleEndTap(cardId);
      break;
      
    case SENDING_DATA:
      Serial.println("System busy sending data, please wait...");
      break;
  }
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void handleLoginTap(String cardId) {
  Serial.println("=== TAP 1: LOGIN ATTEMPT ===");
  
  // Store session info (for now, we'll use a simple approach)
  sessionRfidId = cardId;
  currentSessionId = String(millis()); // Simple session ID
  currentUserId = "1"; // For single user system
  
  currentState = LOGGED_IN;
  
  Serial.println("✓ User logged in successfully!");
  Serial.println("Next: TAP again to START exercise");
  Serial.println("Or use web interface to set weight first");
}

void handleStartTap(String cardId) {
  Serial.println("=== TAP 2: START EXERCISE ===");
  
  // Validate same RFID card
  if (cardId != sessionRfidId) {
    Serial.println("✗ Different RFID card detected!");
    Serial.println("Please use the same card that logged in");
    return;
  }
  
  // Check if weight is set (you can get this from web interface)
  if (currentWeight <= 0) {
    Serial.println("⚠ Weight not set! Using default 10kg");
    currentWeight = 10.0; // Default weight
  }
  
  // Start exercise session
  currentState = EXERCISING;
  sessionStartTime = millis();
  mpuActive = true;
  
  // Reset exercise counters
  currentSet = 1;
  currentReps = 0;
  totalReps = 0;
  totalSets = 0;
  isUp = false;
  lastRepTime = millis();
  lastMovementTime = millis();
  
  Serial.println("✓ Exercise session started!");
  Serial.print("Weight: ");
  Serial.print(currentWeight);
  Serial.println(" kg");
  Serial.println("MPU6050 tracking activated");
  Serial.println("Next: TAP again to END session");
}

void handleEndTap(String cardId) {
  Serial.println("=== TAP 3: END SESSION ===");
  
  // Validate same RFID card
  if (cardId != sessionRfidId) {
    Serial.println("✗ Different RFID card detected!");
    Serial.println("Please use the same card that started the session");
    return;
  }
  
  // Stop MPU tracking
  mpuActive = false;
  
  // Finalize current set if there are reps
  if (currentReps > 0) {
    finishCurrentSet();
  }
  
  // Calculate session duration
  unsigned long sessionDuration = (millis() - sessionStartTime) / 1000; // seconds
  
  Serial.println("✓ Exercise session ended!");
  Serial.println("=== SESSION SUMMARY ===");
  Serial.print("Duration: ");
  Serial.print(sessionDuration);
  Serial.println(" seconds");
  Serial.print("Total Sets: ");
  Serial.println(totalSets);
  Serial.print("Total Reps: ");
  Serial.println(totalReps);
  Serial.print("Weight: ");
  Serial.print(currentWeight);
  Serial.println(" kg");
  Serial.println("=======================");
  
  // Send data to server
  currentState = SENDING_DATA;
  sendWorkoutDataToServer(sessionDuration);
}

void handleMotionTracking() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastSampleTime < sampleInterval) {
    return;
  }
  
  lastSampleTime = currentTime;
  
  // Read sensor data
  SensorData data = readSensorData();
  
  // Update angles
  updateAngles(data);
  
  // Detect repetitions
  detectRepetition(pitch);
  
  // Check for set timeout (30 seconds of no movement)
  if (currentReps > 0 && (currentTime - lastMovementTime > setTimeout)) {
    finishCurrentSet();
  }
  
  // Print status every 1 second
  static unsigned long lastPrint = 0;
  if (currentTime - lastPrint > 1000) {
    lastPrint = currentTime;
    Serial.print("Pitch: ");
    Serial.print(pitch, 2);
    Serial.print("° | Set: ");
    Serial.print(currentSet);
    Serial.print(" | Rep: ");
    Serial.print(currentReps);
    Serial.print(" | Total Reps: ");
    Serial.print(totalReps);
    Serial.print(" | Temp: ");
    Serial.print(data.temperature, 2);
    Serial.println("°C");
  }
}

void detectRepetition(float currentPitch) {
  // Apply noise threshold
  if (abs(currentPitch) < noiseThreshold) {
    currentPitch = 0;
  }
  
  // Detect upward motion (lifting)
  if (currentPitch > pitchThreshold && !isUp) {
    isUp = true;
    lastMovementTime = millis();
    Serial.println("↑ UP motion detected");
  }
  
  // Detect downward motion (repetition completed)
  if (currentPitch < -pitchThreshold && isUp) {
    isUp = false;
    currentReps++;
    totalReps++;
    lastRepTime = millis();
    lastMovementTime = millis();
    
    Serial.print("✓ Rep complete! Set: ");
    Serial.print(currentSet);
    Serial.print(" | Rep: ");
    Serial.println(currentReps);
  }
}

void finishCurrentSet() {
  if (currentReps > 0) {
    totalSets++;
    Serial.println("\n--- SET COMPLETED ---");
    Serial.print("Set ");
    Serial.print(totalSets);
    Serial.print(": ");
    Serial.print(currentReps);
    Serial.println(" reps");
    Serial.println("--------------------");
    
    // Reset for next set
    currentReps = 0;
    currentSet++;
    lastRepTime = millis();
  }
}

void sendWorkoutDataToServer(unsigned long duration) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, cannot send data");
    resetToIdle();
    return;
  }
  
  Serial.println("📤 Sending workout data to server...");
  
  // Create workout data payload
  DynamicJsonDocument doc(1024);
  doc["session_id"] = currentSessionId;
  doc["user_id"] = currentUserId;
  doc["weight"] = currentWeight;
  doc["reps"] = totalReps;
  doc["sets"] = totalSets;
  doc["duration"] = duration;
  doc["workout_date"] = getCurrentDateTime();
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Payload: " + payload);
  
  // Send HTTP POST request
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, String(serverUrl) + "/workout-data.php");
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Server response (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
    
    // Parse response
    DynamicJsonDocument responseDoc(512);
    if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
      if (responseDoc["status"] == "success") {
        Serial.println("✓ Data sent successfully!");
      } else {
        Serial.print("✗ Server error: ");
        Serial.println(responseDoc["message"].as<String>());
      }
    }
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Reset to idle state
  resetToIdle();
}

void resetToIdle() {
  currentState = IDLE;
  currentSessionId = "";
  currentUserId = "";
  sessionRfidId = "";
  currentWeight = 0.0;
  sessionStartTime = 0;
  mpuActive = false;
  
  // Reset exercise counters
  currentSet = 1;
  currentReps = 0;
  totalReps = 0;
  totalSets = 0;
  isUp = false;
  
  Serial.println("\n🔄 System reset to IDLE");
  Serial.println("Ready for next user - TAP RFID to login");
}

String getCurrentDateTime() {
  // Simple timestamp - in production you'd use NTP
  return String(millis());
}

String getStateString() {
  switch (currentState) {
    case IDLE: return "IDLE";
    case LOGGED_IN: return "LOGGED_IN";
    case EXERCISING: return "EXERCISING";
    case SENDING_DATA: return "SENDING_DATA";
    default: return "UNKNOWN";
  }
}

// === MPU6050 FUNCTIONS ===

SensorData readSensorData() {
  SensorData s;
  int16_t ax, ay, az, gx, gy, gz;
  int16_t temperature;

  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  temperature = mpu.getTemperature();

  s.accelX = (ax / 16384.0) - accelOffsetX;
  s.accelY = (ay / 16384.0) - accelOffsetY;
  s.accelZ = (az / 16384.0) - accelOffsetZ;

  s.gyroX = (gx / 131.0) - gyroOffsetX;
  s.gyroY = (gy / 131.0) - gyroOffsetY;
  s.gyroZ = (gz / 131.0) - gyroOffsetZ;

  s.temperature = temperature / 340.0 + 36.53;

  return s;
}

void updateAngles(SensorData data) {
  float accelPitch = atan2(-data.accelX, sqrt(data.accelY * data.accelY + data.accelZ * data.accelZ));
  accelPitch = accelPitch * 180.0 / PI;

  float gyroPitchRate = data.gyroY;

  pitch = alpha * (pitch + gyroPitchRate * timeConstant) + (1 - alpha) * accelPitch;
}

void loadMPUCalibration() {
  uint32_t magic;
  EEPROM.get(EEPROM_MAGIC, magic);

  if (magic == 0xCAFEBABE) {
    EEPROM.get(EEPROM_ACCEL_X, accelOffsetX);
    EEPROM.get(EEPROM_ACCEL_Y, accelOffsetY);
    EEPROM.get(EEPROM_ACCEL_Z, accelOffsetZ);
    EEPROM.get(EEPROM_GYRO_X, gyroOffsetX);
    EEPROM.get(EEPROM_GYRO_Y, gyroOffsetY);
    EEPROM.get(EEPROM_GYRO_Z, gyroOffsetZ);
    Serial.println("MPU6050 calibration loaded from EEPROM");
  } else {
    Serial.println("No MPU calibration found, using defaults");
  }
}

// === UTILITY FUNCTIONS ===

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

String getCardIdString() {
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  return cardId;
}

void handleSerialCommands() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  
  if (command == "status") {
    Serial.println("\n=== SYSTEM STATUS ===");
    Serial.print("State: ");
    Serial.println(getStateString());
    Serial.print("WiFi: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    Serial.print("Session RFID: ");
    Serial.println(sessionRfidId != "" ? sessionRfidId : "None");
    Serial.print("MPU Active: ");
    Serial.println(mpuActive ? "Yes" : "No");
    if (currentState == EXERCISING) {
      Serial.print("Current Set: ");
      Serial.println(currentSet);
      Serial.print("Current Reps: ");
      Serial.println(currentReps);
      Serial.print("Total Reps: ");
      Serial.println(totalReps);
    }
    Serial.println("====================");
  }
  else if (command == "reset") {
    resetToIdle();
  }
  else if (command == "help") {
    Serial.println("\n=== COMMANDS ===");
    Serial.println("status - Show system status");
    Serial.println("reset  - Reset to idle state");
    Serial.println("help   - Show this help");
    Serial.println("================");
  }
}

// === WEB SERVER FUNCTIONS ===

void setupServerRoutes() {
  server.on("/", HTTP_GET, handleWebRoot);
  server.on("/status", HTTP_GET, handleWebStatus);
  server.on("/set-weight", HTTP_POST, handleSetWeight);
  
  // API endpoints for login.js compatibility
  server.on("/reset-rfid", HTTP_POST, handleResetRfid);
  server.on("/start-session", HTTP_POST, handleStartSession);
  
  // CORS handling
  server.on("/status", HTTP_OPTIONS, handleCors);
  server.on("/reset-rfid", HTTP_OPTIONS, handleCors);
  server.on("/start-session", HTTP_OPTIONS, handleCors);
  
  server.onNotFound(handleNotFound);
}

void handleWebRoot() {
  String html = "<html><head><title>Fitness Tracker</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#1a1a1a;color:#fff;}";
  html += ".card{background:#232323;padding:15px;margin:10px 0;border-radius:8px;}";
  html += ".status{color:#10b981;} .idle{color:#6b7280;}";
  html += "input{padding:8px;margin:5px;border-radius:4px;border:1px solid #333;background:#2a2a2a;color:#fff;}";
  html += "button{padding:10px 20px;background:#FF7878;color:white;border:none;border-radius:5px;cursor:pointer;}";
  html += "</style></head><body>";
  html += "<h1>🏋️ Fitness Tracker</h1>";
  
  html += "<div class='card'>";
  html += "<h3>System Status</h3>";
  html += "<p>State: <span class='" + String(currentState == IDLE ? "idle" : "status") + "'>";
  html += getStateString() + "</span></p>";
  if (sessionRfidId != "") {
    html += "<p>Session RFID: " + sessionRfidId + "</p>";
  }
  html += "</div>";
  
  if (currentState == LOGGED_IN) {
    html += "<div class='card'>";
    html += "<h3>Set Weight</h3>";
    html += "<form action='/set-weight' method='post'>";
    html += "<input type='number' name='weight' placeholder='Weight (kg)' step='0.5' min='1' required>";
    html += "<button type='submit'>Set Weight</button>";
    html += "</form>";
    html += "<p>Current weight: " + String(currentWeight) + " kg</p>";
    html += "</div>";
  }
  
  if (currentState == EXERCISING) {
    html += "<div class='card'>";
    html += "<h3>Exercise in Progress</h3>";
    html += "<p>Set: " + String(currentSet) + "</p>";
    html += "<p>Current Reps: " + String(currentReps) + "</p>";
    html += "<p>Total Reps: " + String(totalReps) + "</p>";
    html += "<p>Weight: " + String(currentWeight) + " kg</p>";
    html += "</div>";
  }
  
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleWebStatus() {
  DynamicJsonDocument doc(512);
  doc["state"] = getStateString();
  doc["session_rfid"] = sessionRfidId;
  doc["mpu_active"] = mpuActive;
  doc["current_set"] = currentSet;
  doc["current_reps"] = currentReps;
  doc["total_reps"] = totalReps;
  doc["weight"] = currentWeight;
  
  // Add fields that login.js expects
  doc["session_active"] = (currentState == EXERCISING);
  doc["rfid_id"] = lastScannedRfid;
  doc["last_rfid_check"] = lastScanTime;
  doc["current_time"] = millis();
  
  String response;
  serializeJson(doc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", response);
}

// Handle CORS preflight requests
void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "text/plain", "");
}

// Handle reset RFID endpoint (for login.js compatibility)
void handleResetRfid() {
  Serial.println("RFID reset requested via API");
  
  // Clear RFID state but don't reset the session
  lastScannedRfid = "";
  lastScanTime = 0;
  
  DynamicJsonDocument responseDoc(256);
  responseDoc["status"] = "success";
  responseDoc["message"] = "RFID state reset successfully";
  
  String response;
  serializeJson(responseDoc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  server.send(200, "application/json", response);
}

// Handle start session endpoint (for login.js compatibility)
void handleStartSession() {
  if (!server.hasArg("plain")) {
    DynamicJsonDocument errorDoc(256);
    errorDoc["status"] = "error";
    errorDoc["message"] = "No data provided";
    
    String errorResponse;
    serializeJson(errorDoc, errorResponse);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", errorResponse);
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Web start session request: " + body);
  
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    DynamicJsonDocument errorDoc(256);
    errorDoc["status"] = "error";
    errorDoc["message"] = "Invalid JSON format";
    
    String errorResponse;
    serializeJson(errorDoc, errorResponse);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", errorResponse);
    return;
  }
  
  // If we're in LOGGED_IN state and weight is provided, store it
  if (currentState == LOGGED_IN && doc.containsKey("weight")) {
    currentWeight = doc["weight"].as<float>();
    Serial.print("Weight set via API: ");
    Serial.print(currentWeight);
    Serial.println(" kg");
  }
  
  // If we have session info, store it
  if (doc.containsKey("session_id")) {
    currentSessionId = doc["session_id"].as<String>();
  }
  if (doc.containsKey("user_id")) {
    currentUserId = doc["user_id"].as<String>();
  }
  
  DynamicJsonDocument responseDoc(256);
  responseDoc["status"] = "success";
  responseDoc["message"] = "Session data updated";
  responseDoc["current_state"] = getStateString();
  
  String response;
  serializeJson(responseDoc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  server.send(200, "application/json", response);
}

void handleSetWeight() {
  if (server.hasArg("weight")) {
    currentWeight = server.arg("weight").toFloat();
    Serial.print("Weight set to: ");
    Serial.print(currentWeight);
    Serial.println(" kg");
  }
  server.sendHeader("Location", "/");
  server.send(303);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}