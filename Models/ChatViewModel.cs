namespace test4.Models
{
    public class ChatViewModel
    {
        public string StudentName { get; set; }
        public string StudentAccount { get; set; }
        public Dictionary<string, List<StudentConversation>> ConversationsBySubject { get; set; }
    }

}
