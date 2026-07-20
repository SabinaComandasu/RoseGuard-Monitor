# RoseGuard Monitor

An IoT platform for health monitoring. An **ESP32** microcontroller reads biometric data
from medical sensors (blood oxygen saturation (SpO₂), heart rate and body temperature)
and streams it over **Bluetooth Low Energy** to a **Vue 3** web application. The data is
turned into easy-to-read health KPIs, stored in a PostgreSQL database, and interpreted by
an AI assistant that offers general observations and recommendations.

> ⚠️ RoseGuard Monitor is intended for **general personal monitoring**, not for medical
> diagnosis. AI responses always include a disclaimer to consult a healthcare professional.

## Features

- **Real-time biometric monitoring**: SpO₂, heart rate and temperature streamed from the
  ESP32 over BLE (~1 Hz) and displayed live in the dashboard.
- **Health KPIs with status labels**: each parameter is flagged `Normal`, `Warning`,
  `Critical` or `No Data`, alongside derived indicators (BMI, cardiovascular risk, lifestyle
  score, estimated calories via the Harris-Benedict formula).
- **User accounts**: email/password (BCrypt-hashed) or **Google OAuth**, with a JWT-based
  session (7-day validity) protecting the app routes.
- **User profile**: personal, physical, medical, lifestyle and emergency-contact data;
  updates automatically recalculate KPIs such as BMI.
- **History & trends**: interactive charts (min / max / average) over a chosen period.
- **AI assistant powered by Groq**, with three entry points:
  1. analysis of biometric history,
  2. analysis of the daily wellness journal,
  3. a context-aware conversational chat.
- **Wellness journal**: daily mood, energy, stress, sleep, symptoms and activity, with an
  automatic structured AI analysis.
- **PDF reports**: generated client-side (jsPDF), optionally including trend charts and the
  AI analysis, and re-downloadable from the Reports page.

## Tech Stack

| Layer | Technology |
|---|---|
| Hardware | ESP32-WROOM-32 (Arduino), sensors MAX30102 (SpO₂ + heart rate) & MLX90614 (temperature), SSD1306 OLED, passive buzzer, I²C, BLE 4.2 |
| Backend | ASP.NET Core 10 Web API (JWT + Google OAuth, BCrypt) |
| Real-time | SignalR + Web Bluetooth (BLE notifications) |
| Database | PostgreSQL + Entity Framework Core |
| AI | Groq API (chat, biometric & journal analysis) |
| PDF reports | jsPDF (client-side) |
| Frontend | Vue 3 + Vite + TypeScript + Pinia + PrimeVue + ApexCharts |

## Architecture

The system is split into three independent layers communicating over standardized protocols:

```
  ESP32 (sensors)
      │  BLE Notify (CSV, ~1 Hz)
      ▼
  Frontend (Vue 3, Web Bluetooth)  --HTTPS POST (API key)-->  Groq API
      │  HTTPS REST (Bearer JWT)
      ▼
  Backend (ASP.NET Core 10)  --Npgsql-->  PostgreSQL
```

- **Hardware** collects and transmits sensor data only.
- **Backend** handles authentication and data storage (users, biometric readings).
- **Frontend** connects everything, renders live KPIs and calls Groq directly for AI features.

## Project Structure

```
/ArduinoComponent    ESP32 firmware (Arduino .ino)
/backend             ASP.NET Core 10 Web API (RoseGuard.API)
/frontend            Vue 3 + Vite web app
```

## Getting Started

### Requirements
- A **Web Bluetooth**-capable desktop browser (Chrome, Edge or Opera) with Bluetooth 4.0+.
- .NET 10 SDK, Node.js 20.19+ (or 22.12+), PostgreSQL.
- Arduino IDE with ESP32 support and the sensor libraries (MAX30102, MLX90614, SSD1306).

### Backend
```bash
cd backend/RoseGuard.API
dotnet restore
dotnet ef database update
dotnet run
```
Configure the PostgreSQL connection string, JWT secret, Google OAuth Client ID and any
secrets in `appsettings` / user-secrets (kept out of source control).

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Firmware
Open `ArduinoComponent/ArduinoComponent.ino` in the Arduino IDE, select the ESP32 board,
and upload. The device advertises as `ESP32_Health` and exposes a BLE NOTIFY characteristic
that sends the readings as a CSV string.

## License

Diploma project, University of Craiova, Faculty of Automation, Computers and Electronics.
