namespace RoseGuard.API.Models;

public class BiometricReading
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public float SpO2 { get; set; }
    public float HeartRate { get; set; }
    public float Temperature { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
