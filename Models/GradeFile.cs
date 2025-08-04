namespace test4.Models
{
    public class GradeFile
    {
        public int Id { get; set; }
        public string TeacherAccount { get; set; }  // 教师账号
        public string FileName { get; set; }  // 文件名称/标题
        public string FileUrl { get; set; }  // 文件URL
        public DateTime UploadDate { get; set; } = DateTime.Now;  // 上传日期

        // 导航属性 - 关联教师
        public Teacher Teacher { get; set; }
    }
}
