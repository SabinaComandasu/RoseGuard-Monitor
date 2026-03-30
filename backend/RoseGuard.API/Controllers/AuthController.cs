using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoseGuard.API.Data;
using RoseGuard.API.DTOs;
using RoseGuard.API.Models;
using RoseGuard.API.Services;

namespace RoseGuard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, TokenService tokens, IConfiguration config) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "Email already in use." });

        var user = new User
        {
            Email        = req.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FirstName    = req.FirstName,
            LastName     = req.LastName,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(new AuthResponse(tokens.Generate(user), user.Email, user.FirstName, user.LastName));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLowerInvariant());

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(new AuthResponse(tokens.Generate(user), user.Email, user.FirstName, user.LastName));
    }

    [HttpPost("google")]
    public async Task<IActionResult> Google(GoogleAuthRequest req)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [config["Google:ClientId"]!]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);
        }
        catch
        {
            return Unauthorized(new { message = "Invalid Google token." });
        }

        var email = payload.Email.ToLowerInvariant();
        var user  = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                Email        = email,
                PasswordHash = string.Empty,
                FirstName    = payload.GivenName ?? payload.Name ?? email,
                LastName     = payload.FamilyName ?? string.Empty,
                AvatarUrl    = payload.Picture,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        return Ok(new AuthResponse(tokens.Generate(user), user.Email, user.FirstName, user.LastName));
    }
}
