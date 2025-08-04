namespace test4.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }  // 主键
        public String ConversationId { get; set; }  // 外键，指向StudentConversations
        public string Message { get; set; }  // 聊天内容
        public string MessageType { get; set; }  // 消息类型（AI或人类）
        public DateTime Timestamp { get; set; }  // 消息发送时间

        // 导航属性，EF 会根据这个外键进行关联
        public StudentConversation Conversation { get; set; }
    }

}
