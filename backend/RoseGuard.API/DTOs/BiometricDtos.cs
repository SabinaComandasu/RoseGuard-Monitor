namespace RoseGuard.API.DTOs;

public record BiometricReadingRequest(float Spo2, float HeartRate, float Temperature);
