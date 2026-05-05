#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MLX90614.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

// ================= I2C =================
#define SDA_PIN 21
#define SCL_PIN 22
#define I2C_HZ  100000

// MAX30102
#define MAX_ADDR 0x57

// ================= OLED (SSD1306) =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ================= MLX90614 =================
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ================= BEEP =================
#define BEEP_PIN 25

void beep(int freq, int duration) {
  tone(BEEP_PIN, freq, duration);
  delay(duration + 50);
}

void successSound() {
  beep(600, 100); beep(800, 100); beep(1200, 200);
}

void removeSound() {
  beep(1000, 100); beep(600, 300);
}

void bleConnectSound() {
  beep(523, 80); beep(1047, 250);
}

void bleDisconnectSound() {
  beep(880, 80); beep(440, 80); beep(220, 250);
}

void bootSound() {
  beep(330, 100); delay(60);
  beep(330, 100); delay(60);
  beep(494, 150); delay(80);
  beep(392, 100); delay(60);
  beep(523, 400);
}

void heartBeep() {
  tone(BEEP_PIN, 880, 40);  // short sharp beep per beat, non-blocking
}

// ================= BLE =================
#define SERVICE_UUID        "12345678-1234-5678-1234-56789abcdef0"
#define CHARACTERISTIC_UUID "abcdef01-1234-5678-1234-56789abcdef0"

BLECharacteristic *pCharacteristic;
BLEServer *pServer;
bool bleConnected        = false;
bool pendingConnectSound    = false;
bool pendingDisconnectSound = false;
unsigned long disconnectedAt = 0;  // ms timestamp of last disconnect, 0 = no pending restart

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    bleConnected = true;
    disconnectedAt = 0;
    pendingConnectSound = true;
    Serial.println("Client connected");
  }
  void onDisconnect(BLEServer* server) override {
    bleConnected = false;
    disconnectedAt = millis();
    Serial.println("Client disconnected");
  }
};

// ================= MAX30102 registers =================
#define REG_FIFO_WR_PTR 0x04
#define REG_FIFO_RD_PTR 0x06
#define REG_FIFO_DATA   0x07
#define REG_FIFO_CFG    0x08
#define REG_MODE_CFG    0x09
#define REG_SPO2_CFG    0x0A
#define REG_LED1_PA     0x0C
#define REG_LED2_PA     0x0D
#define REG_PART_ID     0xFF

bool max_rN(uint8_t reg, uint8_t *buf, uint8_t n) {
  Wire.beginTransmission(MAX_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)MAX_ADDR, (int)n, (int)true) != n) return false;
  for (uint8_t i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}
bool max_r8(uint8_t reg, uint8_t &v) { return max_rN(reg, &v, 1); }

uint8_t max_w8(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MAX_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission(true);
}

uint32_t sample18(const uint8_t *p) {
  return (((uint32_t)p[0] << 16) | ((uint32_t)p[1] << 8) | p[2]) & 0x3FFFF;
}

int max_fifoCount() {
  uint8_t wr = 0, rd = 0;
  if (!max_r8(REG_FIFO_WR_PTR, wr)) return -1;
  if (!max_r8(REG_FIFO_RD_PTR, rd)) return -1;
  return (wr - rd) & 0x1F;
}

// ================= Signal processing =================
float dcIR = 0, dcRed = 0;
float acIR = 0, acRed = 0;
float filtIR = 0, prevFiltIR = 0, prevDiff = 0;
unsigned long lastBeatMs = 0;
float bpmAvg = 0;
float spo2Avg = 0;
bool finger = false;
bool prevFinger = false;

const float DC_ALPHA = 0.05f;
const float AC_ALPHA = 0.05f;
const float MIN_PEAK = 300.0f;
const unsigned long REFRACT_MS = 400;

uint32_t lastIR = 0;
uint32_t lastRed = 0;

void updateVitals(uint32_t redRaw, uint32_t irRaw) {
  lastRed = redRaw;
  lastIR  = irRaw;

  finger = (irRaw > 20000);

  dcIR  = (dcIR  == 0) ? irRaw  : dcIR  + DC_ALPHA * (irRaw  - dcIR);
  dcRed = (dcRed == 0) ? redRaw : dcRed + DC_ALPHA * (redRaw - dcRed);

  float irAC  = irRaw  - dcIR;
  float redAC = redRaw - dcRed;

  acIR  += AC_ALPHA * (fabsf(irAC)  - acIR);
  acRed += AC_ALPHA * (fabsf(redAC) - acRed);

  prevFiltIR = filtIR;
  filtIR = 0.8f * filtIR + 0.2f * irAC;

  float diff = filtIR - prevFiltIR;
  bool peak = (prevDiff > 0 && diff <= 0);

  unsigned long now = millis();
  if (finger && peak && prevFiltIR > MIN_PEAK && (now - lastBeatMs) > REFRACT_MS) {
    if (lastBeatMs) {
      float bpm = 60000.0f / (now - lastBeatMs);
      if (bpm >= 40 && bpm <= 200)
        bpmAvg = bpmAvg == 0 ? bpm : 0.6f * bpmAvg + 0.4f * bpm;
    }
    lastBeatMs = now;
  }
  prevDiff = diff;

  if (finger && dcRed > 1 && dcIR > 1 && acIR > 1) {
    float R = (acRed / dcRed) / (acIR / dcIR);
    float s = -45.060f * R * R + 30.354f * R + 94.845f;
    s = constrain(s, 0, 100);
    spo2Avg = spo2Avg == 0 ? s : 0.9f * spo2Avg + 0.1f * s;
  } else {
    bpmAvg *= 0.95f;
    spo2Avg *= 0.95f;
  }
}

void max30102Init() {
  max_w8(REG_MODE_CFG, 0x40);
  delay(100);
  max_w8(REG_FIFO_CFG, 0x10);
  max_w8(REG_SPO2_CFG, 0x27);
  max_w8(REG_LED1_PA, 0x40);
  max_w8(REG_LED2_PA, 0x40);
  max_w8(REG_MODE_CFG, 0x03);
  delay(50);
}

// ================= OLED =================
void drawScreen(float tempObjC) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("Puls: ");
  finger ? display.print((int)bpmAvg) : display.print("--");
  display.println(" bpm");

  display.setCursor(0, 16);
  display.print("Oxigen: ");
  finger ? display.print((int)spo2Avg) : display.print("--");
  display.println("%");

  display.setCursor(0, 32);
  display.print("Deget: ");
  display.println(finger ? "detectat" : "nedetectat");

  display.setCursor(0, 48);
  display.print("Temp: ");
  isfinite(tempObjC) ? display.print(tempObjC, 1) : display.print("--");
  display.println(" C");

  display.display();
}

void serialPrint(float tempObjC) {
  Serial.print("Puls: ");
  finger ? Serial.print((int)bpmAvg) : Serial.print("--");
  Serial.print(" bpm | Oxigen: ");
  finger ? Serial.print((int)spo2Avg) : Serial.print("--");
  Serial.print("% | Deget: ");
  Serial.print(finger ? "detectat" : "nedetectat");
  Serial.print(" | Temp: ");
  isfinite(tempObjC) ? Serial.print(tempObjC, 1) : Serial.print("--");
  Serial.print(" C | IR:");
  Serial.print((unsigned long)lastIR);
  Serial.print(" RED:");
  Serial.println((unsigned long)lastRed);
}

void bleSend(float tempObjC) {
  float tempF = isfinite(tempObjC) ? (tempObjC * 9.0f / 5.0f + 32.0f) : NAN;
  char msg[96];
  snprintf(msg, sizeof(msg),
    "%d,%d,%d,%.2f,%.2f,%lu,%lu",
    finger ? (int)bpmAvg : -1,
    finger ? (int)spo2Avg : -1,
    finger ? 1 : 0,
    isfinite(tempObjC) ? tempObjC : -1000.0f,
    isfinite(tempF) ? tempF : -1000.0f,
    (unsigned long)lastIR,
    (unsigned long)lastRed
  );
  pCharacteristic->setValue((uint8_t*)msg, strlen(msg));
  if (bleConnected) pCharacteristic->notify();
  Serial.print("[BLE] ");
  Serial.println(msg);
}

// ---- 16x16 rose icon ----
const uint8_t PROGMEM rose16[] = {
  0b00000000,0b00000000,
  0b00000111,0b11100000,
  0b00001111,0b11110000,
  0b00011100,0b00111000,
  0b00111011,0b11011100,
  0b00110111,0b11101100,
  0b00110111,0b11101100,
  0b00111011,0b11011100,
  0b00011100,0b00111000,
  0b00001111,0b11110000,
  0b00000111,0b11100000,
  0b00000011,0b11000000,
  0b00000001,0b10000000,
  0b00000001,0b10000000,
  0b00000011,0b11000000,
  0b00000000,0b00000000
};

void showSplash() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2);

  const char *l1 = "RoseGuard";
  const char *l2 = "Monitor";
  int16_t x1, y1; uint16_t w1, h1;
  display.getTextBounds(l1, 0, 0, &x1, &y1, &w1, &h1);
  int16_t x2, y2; uint16_t w2, h2;
  display.getTextBounds(l2, 0, 0, &x2, &y2, &w2, &h2);

  display.setCursor((SCREEN_WIDTH - (int)w1) / 2, 6);
  display.print(l1);
  display.setCursor((SCREEN_WIDTH - (int)w2) / 2, 26);
  display.print(l2);
  display.drawBitmap((SCREEN_WIDTH - 16) / 2, 46, rose16, 16, 16, SSD1306_WHITE);
  display.display();
  delay(1500);
}

// ================= Main =================
unsigned long lastOledMs  = 0;
unsigned long lastMlxMs   = 0;
unsigned long lastBleMs   = 0;
unsigned long lastBeepMs  = 0;
float mlxObjC = NAN;

void setup() {
  Serial.begin(115200);
  pinMode(BEEP_PIN, OUTPUT);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(I2C_HZ);
  delay(80);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("SSD1306 begin failed");
    while (1) delay(10);
  }
  display.ssd1306_command(SSD1306_SETCONTRAST);
  display.ssd1306_command(0xFF);
  display.ssd1306_command(SSD1306_DISPLAYALLON_RESUME);
  display.ssd1306_command(SSD1306_NORMALDISPLAY);
  display.clearDisplay();
  display.display();

  showSplash();
  bootSound();

  if (!mlx.begin()) Serial.println("MLX90614 not found!");

  uint8_t id;
  if (max_r8(REG_PART_ID, id)) {
    Serial.print("MAX30102 PART ID: 0x");
    Serial.println(id, HEX);
    max30102Init();
  } else {
    Serial.println("MAX30102 not responding at 0x57");
  }

  BLEDevice::init("ESP32_Health");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCharacteristic->addDescriptor(new BLE2902());

  class CharCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) override {
      String val = pChar->getValue();
      if (val.length() > 0 && val[0] == 'D') pendingDisconnectSound = true;
    }
  };
  pCharacteristic->setCallbacks(new CharCallbacks());
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.println("BLE advertising...");
  display.display();
}

void loop() {
  if (pendingConnectSound) {
    pendingConnectSound = false;
    bleConnectSound();
  }
  if (pendingDisconnectSound) {
    pendingDisconnectSound = false;
    bleDisconnectSound();
  }

  // Restart advertising from main loop (safe, with small delay after disconnect)
  if (disconnectedAt > 0 && millis() - disconnectedAt > 300) {
    disconnectedAt = 0;
    BLEDevice::startAdvertising();
    Serial.println("Advertising restarted");
  }

  // MLX read
  if (millis() - lastMlxMs > 1000) {
    lastMlxMs = millis();
    float t = mlx.readObjectTempC();
    mlxObjC = isfinite(t) ? t : NAN;
  }

  // MAX read — drain all available samples each loop
  int nSamples = max_fifoCount();
  for (int i = 0; i < nSamples; i++) {
    uint8_t d[6];
    if (!max_rN(REG_FIFO_DATA, d, 6)) break;
    updateVitals(sample18(d), sample18(d + 3));
  }

  if (finger && !prevFinger) {
    bpmAvg  = 0;
    spo2Avg = 0;
    dcIR    = 0;
    dcRed   = 0;
    successSound();
    lastBeepMs = millis() + 900;  // delay before first beep
  }
  if (!finger && prevFinger) {
    bpmAvg  = 0;
    spo2Avg = 0;
    removeSound();
  }
  if (finger && (millis() - lastBeepMs > 800)) {
    tone(BEEP_PIN, 880, 60);
    lastBeepMs = millis();
  }
  prevFinger = finger;

  // OLED + Serial
  if (millis() - lastOledMs > 300) {
    lastOledMs = millis();
    drawScreen(mlxObjC);
    serialPrint(mlxObjC);
  }

  // BLE send (1 Hz)
  if (millis() - lastBleMs > 1000) {
    lastBleMs = millis();
    bleSend(mlxObjC);
  }

  delay(10);
}
