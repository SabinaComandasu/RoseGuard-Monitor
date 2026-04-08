using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RoseGuard.API.Data;
using RoseGuard.API.DTOs;
using RoseGuard.API.Hubs;
using RoseGuard.API.Models;

namespace RoseGuard.API.Controllers;

[ApiController]
[Route("api/biometrics")]
[Authorize]
public class BiometricController(AppDbContext db, IHubContext<BiometricHub> hub) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] BiometricReadingRequest dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var reading = new BiometricReading
        {
            UserId      = userId,
            SpO2        = dto.Spo2,
            HeartRate   = dto.HeartRate,
            Temperature = dto.Temperature,
        };

        db.Readings.Add(reading);
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("ReceiveReading", new
        {
            spo2        = reading.SpO2,
            heartRate   = reading.HeartRate,
            temperature = reading.Temperature,
            timestamp   = reading.Timestamp,
        });

        return Ok();
    }
}
