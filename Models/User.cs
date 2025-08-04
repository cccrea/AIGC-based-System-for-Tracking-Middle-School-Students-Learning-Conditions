// 基类：用户
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
namespace test4.Models
{
    public class UserInfo
    {
        public string Account { get; set; }
        public string Name { get; set; }
    }

    public class User
    {
        // ID 和 Account 结合成一个字段
        [Key]
        public required string Account { get; set; }

        [Required(ErrorMessage = "请输入姓名")]
        [Display(Name = "姓名")]
        public required string Name { get; set; }

        [Phone]
        [Required(ErrorMessage = "请输入手机号")]
        [Display(Name = "手机号")]
        public required string PhoneNumber { get; set; }

        [Required(ErrorMessage = "请输入密码")]
        [Display(Name = "密码")]
        public required string Password { get; set; }
        // 新增：学校ID
        [Display(Name = "所属学校")]
        public int? SchoolId { get; set; }

        // 新增：班级ID
        [Display(Name = "所属班级")]
        public int? ClassId { get; set; }

        [ForeignKey("SchoolId")]
        public virtual School School { get; set; }

        [ForeignKey("ClassId")]
        public virtual Class Class { get; set; }
    }

    // 学生类：继承自 User
    public class Student : User
    {
        // 学生的家长Id (关系绑定)
        [Display(Name = "家长账号")]
        public string? ParentAccount { get; set; }

        // 学生的语文老师Id (关系绑定)
        [Display(Name = "语文教师账号")]
        public string? ChineseTeacherAccount { get; set; }

        // 学生的数学老师Id (关系绑定)
        [Display(Name = "数学教师账号")]
        public string? MathTeacherAccount { get; set; }

        // 学生的英语老师Id (关系绑定)
        [Display(Name = "英语教师账号")]
        public string? EnglishTeacherAccount { get; set; }

        

        [ForeignKey("ParentAccount")]
        public virtual Parent Parent { get; set; }
       
    }

    // 家长类：继承自 User
    public class Parent : User
    {
        // 家长可以绑定多个学生
        public List<Student>? Students { get; set; }
    }

    // 老师类：继承自 User
    public class Teacher : User
    {
        // 老师的学科
        [Required(ErrorMessage = "请输入教授学科")]
        [Display(Name = "教授学科")]
        public string? Subject { get; set; }

        // 老师可以绑定多个学生
        public List<Student>? Students { get; set; }

        // 教师可以有多个教案
        public List<LessonPlan> LessonPlans { get; set; }

        
    }

    // 管理员类：继承自 User
    public class Admin : User
    {
        // 管理员无需额外字段，继承 User 即可
    }
}