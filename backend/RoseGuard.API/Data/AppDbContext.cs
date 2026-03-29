using Microsoft.EntityFrameworkCore;
using RoseGuard.API.Models;

namespace RoseGuard.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<BiometricReading> Readings => Set<BiometricReading>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        model.Entity<BiometricReading>()
            .HasOne(r => r.User)
            .WithMany(u => u.Readings)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
