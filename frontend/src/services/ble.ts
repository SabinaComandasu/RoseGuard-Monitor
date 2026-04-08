import { useBiometricsStore } from '@/stores/biometrics'
import api from './api'

const SERVICE_UUID        = '12345678-1234-5678-1234-56789abcdef0'
const CHARACTERISTIC_UUID = 'abcdef01-1234-5678-1234-56789abcdef0'

let device:         BluetoothDevice | null = null
let characteristic: BluetoothRemoteGATTCharacteristic | null = null

function parseNotification(value: DataView) {
  const text = new TextDecoder().decode(value.buffer)
  const parts = text.split(',')
  if (parts.length < 5) return null

  const bpm    = parseInt(parts[0])
  const spo2   = parseInt(parts[1])
  const finger = parts[2] === '1'
  const tempC  = parseFloat(parts[3])

  return {
    heartRate:      bpm  > 0    ? bpm  : null,
    spo2:           spo2 > 0    ? spo2 : null,
    fingerDetected: finger,
    temperature:    tempC > -999 ? tempC : null,
  }
}

export async function connectBle(): Promise<void> {
  const store = useBiometricsStore()

  device = await navigator.bluetooth.requestDevice({
    filters: [{ name: 'ESP32_Health' }],
    optionalServices: [SERVICE_UUID],
  })

  device.addEventListener('gattserverdisconnected', () => {
    store.setBleConnected(false)
  })

  const server  = await device.gatt!.connect()
  const service = await server.getPrimaryService(SERVICE_UUID)
  characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID)

  characteristic.addEventListener('characteristicvaluechanged', (e) => {
    const val = (e.target as BluetoothRemoteGATTCharacteristic).value!
    const reading = parseNotification(val)
    if (!reading) return

    store.pushReading(reading)

    if (reading.fingerDetected) {
      api.post('/biometrics', {
        spo2:        reading.spo2        ?? -1,
        heartRate:   reading.heartRate   ?? -1,
        temperature: reading.temperature ?? -1000,
      }).catch(() => {})
    }
  })

  await characteristic.startNotifications()
  store.setBleConnected(true)
}

export async function disconnectBle(): Promise<void> {
  if (characteristic && device?.gatt?.connected) {
    try {
      await characteristic.writeValueWithoutResponse(new TextEncoder().encode('D'))
    } catch { /* ignore if write fails */ }
  }
  if (device?.gatt?.connected) device.gatt.disconnect()
  device = null
  characteristic = null
  useBiometricsStore().setBleConnected(false)
}
