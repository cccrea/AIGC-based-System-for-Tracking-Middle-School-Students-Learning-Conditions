using System.ComponentModel.DataAnnotations;

namespace test4.Models
{
    public class LessonPlan
    {
        public int Id { get; set; }  // 自增主键

        // 教师的 Account，作为外键
        public string TeacherAccount { get; set; }

        // 教案名
        public string LessonName { get; set; }

        // 文件 URL
        public string FileUrl { get; set; }
        public DateTime UploadDate { get; set; } = DateTime.Now; // 新增上传日期字段，默认为当前时间

        // 关联教师（教师通过 Account 区分）
        public Teacher Teacher { get; set; }
    }
}
