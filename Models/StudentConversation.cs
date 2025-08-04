using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace test4.Models
{
    public class StudentConversation
    {
        [Required]
        public string StudentAccount { get; set; } // 学生账号

        [Key]
        public string Conversation_id { get; set; } // 会话ID

        [Required]
        public string Subject { get; set; } // 学科

        public string Title { get; set; } // 标题

        public int QuestionCount { get; set; } // 提问次数

        // 新增知识点字段，用JSON字符串存储数组
        public string KnowledgePoints { get; set; }

        // 新增创建时间字段
        public DateTime CreatedTime { get; set; } = DateTime.Now; // 默认为当前时间

        // 新增理解状态字段，默认为"正在学习中"
        public string UnderstandingStatus { get; set; } = "正在学习中"; // 可选值: "已透彻理解", "正在学习中", "难以理解"
    }
}
