using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoseGuard.API.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>("TargetWeightKg",   "Users", nullable: true);
            migrationBuilder.AddColumn<string>("Conditions",       "Users", nullable: true);
            migrationBuilder.AddColumn<string>("Medications",      "Users", nullable: true);
            migrationBuilder.AddColumn<string>("Allergies",        "Users", nullable: true);
            migrationBuilder.AddColumn<string>("FitnessLevel",     "Users", nullable: true);
            migrationBuilder.AddColumn<string>("SmokingStatus",    "Users", nullable: true);
            migrationBuilder.AddColumn<string>("AlcoholConsumption","Users", nullable: true);
            migrationBuilder.AddColumn<float>("SleepHours",        "Users", nullable: true);
            migrationBuilder.AddColumn<string>("EmergencyName",    "Users", nullable: true);
            migrationBuilder.AddColumn<string>("EmergencyPhone",   "Users", nullable: true);
            migrationBuilder.AddColumn<string>("EmergencyRelationship", "Users", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn("TargetWeightKg",        "Users");
            migrationBuilder.DropColumn("Conditions",             "Users");
            migrationBuilder.DropColumn("Medications",            "Users");
            migrationBuilder.DropColumn("Allergies",              "Users");
            migrationBuilder.DropColumn("FitnessLevel",           "Users");
            migrationBuilder.DropColumn("SmokingStatus",          "Users");
            migrationBuilder.DropColumn("AlcoholConsumption",     "Users");
            migrationBuilder.DropColumn("SleepHours",             "Users");
            migrationBuilder.DropColumn("EmergencyName",          "Users");
            migrationBuilder.DropColumn("EmergencyPhone",         "Users");
            migrationBuilder.DropColumn("EmergencyRelationship",  "Users");
        }
    }
}
