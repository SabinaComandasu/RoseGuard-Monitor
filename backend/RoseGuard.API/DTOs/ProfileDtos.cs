namespace RoseGuard.API.DTOs;

public record ProfileResponse(
    string Email,
    string FirstName,
    string LastName,
    string? DateOfBirth,
    string? Sex,
    string? BloodType,
    string? Phone,
    string? AvatarUrl,
    float? HeightCm,
    float? WeightKg,
    float? TargetWeightKg,
    string? Conditions,
    string? Medications,
    string? Allergies,
    string? FitnessLevel,
    string? SmokingStatus,
    string? AlcoholConsumption,
    float? SleepHours,
    string? EmergencyName,
    string? EmergencyPhone,
    string? EmergencyRelationship
);

public record UpdateProfileRequest(
    string FirstName,
    string LastName,
    string? DateOfBirth,
    string? Sex,
    string? BloodType,
    string? Phone,
    string? AvatarUrl,
    float? HeightCm,
    float? WeightKg,
    float? TargetWeightKg,
    string? Conditions,
    string? Medications,
    string? Allergies,
    string? FitnessLevel,
    string? SmokingStatus,
    string? AlcoholConsumption,
    float? SleepHours,
    string? EmergencyName,
    string? EmergencyPhone,
    string? EmergencyRelationship
);
