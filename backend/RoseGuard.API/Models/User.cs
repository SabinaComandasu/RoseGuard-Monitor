namespace RoseGuard.API.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? Sex { get; set; }
    public string? BloodType { get; set; }
    public string? Phone { get; set; }
    public float? HeightCm { get; set; }
    public float? WeightKg { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BiometricReading> Readings { get; set; } = [];
}
