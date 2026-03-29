using Microsoft.AspNetCore.SignalR;

namespace RoseGuard.API.Hubs;

public class BiometricHub : Hub
{
    // ESP32 calls this to push a new reading
    public async Task SendReading(float spo2, float heartRate, float temperature)
    {
        await Clients.All.SendAsync("ReceiveReading", new
        {
            spo2,
            heartRate,
            temperature,
            timestamp = DateTime.UtcNow,
        });
    }
}
