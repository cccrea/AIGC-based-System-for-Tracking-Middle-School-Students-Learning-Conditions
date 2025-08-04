using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace test4.Models
{
    public class AcademicDbContext : DbContext
    {
        public AcademicDbContext(DbContextOptions<AcademicDbContext> options)
            : base(options)
        {
        }

        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<Parent> Parents { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<StudentConversation> StudentConversations { get; set; }
        public DbSet<LessonPlan> LessonPlans { get; set; }
        public DbSet<GradeFile> GradeFiles { get; set; }
        public DbSet<School> Schools { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<LearningPlan> LearningPlans { get; set; }
        public DbSet<LearningPlanTask> LearningPlanTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Class>().ToTable("Class");
            modelBuilder.Entity<School>().ToTable("School");
            // 配置继承策略
            modelBuilder.Entity<User>()
                .HasDiscriminator<string>("UserType")
                .HasValue<Student>("Student")
                .HasValue<Teacher>("Teacher")
                .HasValue<Parent>("Parent")
                .HasValue<Admin>("Admin");

            // 配置 StudentConversation 表的约束
            modelBuilder.Entity<StudentConversation>()
                .HasIndex(sc => new { sc.StudentAccount, sc.Conversation_id })
                .IsUnique(); // 一个学生的每个会话唯一

            // 配置 LessonPlan 表与 Teacher 的外键关系
            modelBuilder.Entity<LessonPlan>()
                .HasOne(l => l.Teacher) // 一个教案关联一个教师
                .WithMany(t => t.LessonPlans) // 一个教师可以有多个教案
                .HasForeignKey(l => l.TeacherAccount); // 外键是 TeacherAccount

            // 配置外键关系
            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Conversation) // 每条消息与一个会话关联
                .WithMany()  // 会话可以有多条消息
                .HasForeignKey(cm => cm.ConversationId);  // 设置外键

            // 配置 GradeFile 表与 Teacher 的外键关系
            modelBuilder.Entity<GradeFile>()
                .HasOne(g => g.Teacher)
                .WithMany()
                .HasForeignKey(g => g.TeacherAccount);

            //// 配置 School 和 Student 的关系
            //modelBuilder.Entity<Student>()
            //    .HasOne(s => s.School)
            //    .WithMany(sc => sc.Students)
            //    .HasForeignKey(s => s.SchoolId)
            //    .OnDelete(DeleteBehavior.NoAction); // 使用 NoAction 替代 SetNull

            ////配置 School 和 Teacher 的关系
            //modelBuilder.Entity<Teacher>()
            //    .HasOne(t => t.School)
            //    .WithMany(sc => sc.Teachers)
            //    .HasForeignKey(t => t.SchoolId)
            //    .OnDelete(DeleteBehavior.NoAction); // 使用 NoAction 替代 SetNull

            //// 配置 Class 和 Student 的关系
            //modelBuilder.Entity<Student>()
            //    .HasOne(s => s.Class)
            //    .WithMany(c => c.Students)
            //    .HasForeignKey(s => s.ClassId)
            //    .OnDelete(DeleteBehavior.NoAction);
            //// 使用 NoAction 替代 SetNull

            //// 配置 School 和 Class 的关系
            //modelBuilder.Entity<Class>()
            //    .HasOne(c => c.School)
            //    .WithMany(s => s.Classes)
            //    .HasForeignKey(c => c.SchoolId)
            //    .OnDelete(DeleteBehavior.NoAction); // 使用 NoAction 替代 Cascade

            // 配置 Student 和 Parent 的关系
            modelBuilder.Entity<Student>()
                .HasOne(s => s.Parent)
                .WithMany(p => p.Students)
                .HasForeignKey(s => s.ParentAccount)
                .OnDelete(DeleteBehavior.NoAction); // 使用 NoAction 替代 SetNull
                                                    // 配置学习计划和学生的关系
            modelBuilder.Entity<LearningPlan>()
                .HasOne(lp => lp.Student)
                .WithMany()
                .HasForeignKey(lp => lp.StudentAccount)
                .OnDelete(DeleteBehavior.NoAction);

            // 配置学习计划和任务的关系
            modelBuilder.Entity<LearningPlanTask>()
                .HasOne(t => t.LearningPlan)
                .WithMany(lp => lp.Tasks)
                .HasForeignKey(t => t.PlanId);

            base.OnModelCreating(modelBuilder);
        }
    }
}