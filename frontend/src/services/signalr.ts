import * as signalR from '@microsoft/signalr'

const connection = new signalR.HubConnectionBuilder()
  .withUrl(import.meta.env.VITE_HUB_URL || 'http://localhost:5000/hubs/biometrics')
  .withAutomaticReconnect()
  .build()

export default connection
