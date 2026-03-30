using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoseGuard.API.Data;
using RoseGuard.API.DTOs;

namespace RoseGuard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(AppDbContext db) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();

        return Ok(new ProfileResponse(
            user.Email,
            user.FirstName,
            user.LastName,
            user.DateOfBirth?.ToString("yyyy-MM-dd"),
            user.Sex,
            user.BloodType,
            user.Phone,
            user.AvatarUrl,
            user.HeightCm,
            user.WeightKg,
            user.TargetWeightKg,
            user.Conditions,
            user.Medications,
            user.Allergies,
            user.FitnessLevel,
            user.SmokingStatus,
            user.AlcoholConsumption,
            user.SleepHours,
            user.EmergencyName,
            user.EmergencyPhone,
            user.EmergencyRelationship
        ));
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateProfileRequest req)
    {
        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();

        user.FirstName            = req.FirstName;
        user.LastName             = req.LastName;
        user.DateOfBirth          = req.DateOfBirth is not null ? DateOnly.Parse(req.DateOfBirth) : null;
        user.Sex                  = req.Sex;
        user.BloodType            = req.BloodType;
        user.Phone                = req.Phone;
        user.AvatarUrl            = req.AvatarUrl;
        user.HeightCm             = req.HeightCm;
        user.WeightKg             = req.WeightKg;
        user.TargetWeightKg       = req.TargetWeightKg;
        user.Conditions           = req.Conditions;
        user.Medications          = req.Medications;
        user.Allergies            = req.Allergies;
        user.FitnessLevel         = req.FitnessLevel;
        user.SmokingStatus        = req.SmokingStatus;
        user.AlcoholConsumption   = req.AlcoholConsumption;
        user.SleepHours           = req.SleepHours;
        user.EmergencyName        = req.EmergencyName;
        user.EmergencyPhone       = req.EmergencyPhone;
        user.EmergencyRelationship = req.EmergencyRelationship;

        await db.SaveChangesAsync();
        return NoContent();
    }
}
