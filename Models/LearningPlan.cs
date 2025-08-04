namespace test4.Models
{
    public class LearningPlan
    {
        public int Id { get; set; }
        public string StudentAccount { get; set; }
        public string Subject { get; set; }  // 学科
        public string Title { get; set; }    // 计划标题
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int Duration { get; set; }    // 持续天数
        public string RecommendedPath { get; set; } // AI推荐学习路径
        public DateTime CreatedTime { get; set; } = DateTime.Now;
        public string Status { get; set; } = "进行中";

        // 导航属性
        public Student Student { get; set; }
        public List<LearningPlanTask> Tasks { get; set; }
    }
}
