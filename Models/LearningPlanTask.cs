namespace test4.Models
{
    public class LearningPlanTask
    {
        public int Id { get; set; }
        public int PlanId { get; set; }
        public DateTime TaskDate { get; set; }
        public string TaskId { get; set; }   // "task-日期索引-任务索引"
        public string Subject { get; set; }
        public string KnowledgePoint { get; set; }
        public string Content { get; set; }
        public string Difficulty { get; set; } // 简单、中等、困难
        public bool Completed { get; set; } = false;
        public DateTime? CompletionDate { get; set; }
        public string ?Reflection { get; set; }

        // 导航属性
        public LearningPlan LearningPlan { get; set; }
    }
}
