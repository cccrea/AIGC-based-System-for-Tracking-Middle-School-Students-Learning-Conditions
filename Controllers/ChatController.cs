using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;
using System.IO;
using Newtonsoft.Json;
using test4.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Data;

namespace test4.Controllers
{
    [ApiController]
    [Route("Chat")]
    public class ChatController : ControllerBase
    {
        private readonly AcademicDbContext _context;

        // 构造函数注入 AcademicDbContext
        public ChatController(AcademicDbContext context)
        {
            _context = context;
        }

        // 获取 AI 响应
        [HttpGet("GetAIResponse")]
        public async Task GetAIResponse(string conversationId, string msg)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("Connection", "keep-alive");

            try
            {
                if (string.IsNullOrEmpty(conversationId))
                {
                    Response.StatusCode = 400;
                    await Response.WriteAsync("data: Error: Conversation ID is required.\n\n");
                    await Response.Body.FlushAsync();
                    return;
                }

                // 从数据库中获取会话信息
                var conversation = await _context.StudentConversations
                    .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);

                if (conversation == null)
                {
                    Response.StatusCode = 404;
                    await Response.WriteAsync($"data: Error: Conversation {conversationId} not found.\n\n");
                    await Response.Body.FlushAsync();
                    return;
                }
                // 增加提问次数
                conversation.QuestionCount++;
                await _context.SaveChangesAsync(); // 保存更新的提问次数

                // 发送提问次数更新的响应
                Console.WriteLine($"提问次数更新为: {conversation.QuestionCount}");

                var apiUrl = "https://api.coze.com/v3/chat";
                var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";  // 请替换为实际的 token

                var requestData = new
                {
                    bot_id = "7402157590962782213",
                    user_id = conversation.StudentAccount, // 使用从会话中获取的 user_id
                                                           // conversation_id = conversationId, // 使用传入的 conversationId
                    stream = true,
                    additional_messages = new[]
                    {
                new { role = "user", type = "question", content = msg, content_type = "text" }
            }
                };

                using var client = new HttpClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                apiUrl = $"{apiUrl}?conversation_id={conversationId}";
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                {
                    Content = new StringContent(JsonConvert.SerializeObject(requestData), Encoding.UTF8, "application/json")
                };
                var requestJson = await httpRequest.Content.ReadAsStringAsync();
                // Console.WriteLine(requestJson);
                using var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    Response.StatusCode = (int)response.StatusCode;
                    await Response.WriteAsync($"data: Error: {response.StatusCode}\n\n");
                    await Response.Body.FlushAsync();
                    return;
                }

                var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
                Dictionary<string, List<string>> datas = new Dictionary<string, List<string>>();
                List<string> datas1 = new List<string>();
                while (!reader.EndOfStream)
                {

                    var line = await reader.ReadLineAsync();
                    if (!string.IsNullOrEmpty(line))
                    {
                        datas1.Add(line);

                        // 如果消息中包含[DONE]，仅发送一个统一的[DONE]消息
                        if (line.Contains("[DONE]"))
                        {
                            var doneMessage = "data: [DONE]\n\n";
                            await Response.WriteAsync(doneMessage);
                            await Response.Body.FlushAsync();
                            break;
                        }

                        else
                        {
                            // 正常发送其他消息
                            var message = $"data: {line}\n\n";
                            Console.WriteLine(message);
                            await Response.WriteAsync(message);
                            await Response.Body.FlushAsync();
                        }
                    }
                }           
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                var errorMessage = $"data: Error: {ex.Message}\n\n";
                await Response.WriteAsync(errorMessage);
                await Response.Body.FlushAsync();
            }
            finally
            {
                Response.Body.Close();
            }
        }
        // 存储聊天记录
        [HttpPost("SaveChatMessage")]
        public async Task<IActionResult> SaveChatMessage([FromBody] ChatRequestModel chatRequest)
        {
            if (chatRequest == null || string.IsNullOrEmpty(chatRequest.conversation_id) || string.IsNullOrEmpty(chatRequest.message))
            {
                return BadRequest("Conversation ID and message cannot be null or empty.");
            }

            // 获取会话信息
            var conversation = await _context.StudentConversations
                .FirstOrDefaultAsync(c => c.Conversation_id == chatRequest.conversation_id);

            if (conversation == null)
            {
                return NotFound($"Conversation with ID {chatRequest.conversation_id} not found.");
            }

            // 创建聊天记录
            var chatMessage = new ChatMessage
            {
                ConversationId = chatRequest.conversation_id,  // 关联会话
                Message = chatRequest.message,  // 存储消息
                MessageType = chatRequest.user_id == conversation.StudentAccount ? "human" : "AI",  // 根据用户 ID 来判断消息是人类还是 AI
                Timestamp = DateTime.UtcNow  // 消息时间
            };

            // 保存聊天记录
            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Chat message saved successfully." });
        }

        // 获取聊天记录
        [HttpGet("GetChatMessages")]
        public async Task<IActionResult> GetChatMessages(string conversationId)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest("Conversation ID cannot be null or empty.");
            }

            // 获取会话信息
            var conversation = await _context.StudentConversations
                .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);

            if (conversation == null)
            {
                return NotFound($"Conversation with ID {conversationId} not found.");
            }

            // 获取该会话下的所有聊天记录
            var chatMessages = await _context.ChatMessages
                .Where(cm => cm.ConversationId == conversationId)
                .OrderBy(cm => cm.Timestamp)
                .ToListAsync();

            if (chatMessages.Count == 0)
            {
                return NotFound("No chat messages found for this conversation.");
            }

            return Ok(chatMessages);  // 返回聊天记录
        }
        // 获取心理咨询师 AI 响应
        [HttpGet("GetCounselorResponse")]
        public async Task GetCounselorResponse(string msg, string studentAccount)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("Connection", "keep-alive");

            try
            {
                if (string.IsNullOrEmpty(msg))
                {
                    Response.StatusCode = 400;
                    await Response.WriteAsync("data: Error: Message is required.\n\n");
                    await Response.Body.FlushAsync();
                    return;
                }

                var apiUrl = "https://api.coze.com/v3/chat";
                var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";

                var requestData = new
                {
                    bot_id = "7478699395953770501", // 心理咨询师的 bot_id
                    user_id = studentAccount,       // 使用学生账号作为用户标识
                    stream = true,
                    additional_messages = new[]
                    {
                new { role = "user", type = "question", content = msg, content_type = "text" }
            }
                };

                using var client = new HttpClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var httpRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                {
                    Content = new StringContent(JsonConvert.SerializeObject(requestData), Encoding.UTF8, "application/json")
                };

                using var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    Response.StatusCode = (int)response.StatusCode;
                    await Response.WriteAsync($"data: Error: {response.StatusCode}\n\n");
                    await Response.Body.FlushAsync();
                    return;
                }

                var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
                List<string> datas1 = new List<string>();
                while (!reader.EndOfStream)
                {

                    var line = await reader.ReadLineAsync();
                    if (!string.IsNullOrEmpty(line))
                    {
                        datas1.Add(line);

                        // 如果消息中包含[DONE]，仅发送一个统一的[DONE]消息
                        if (line.Contains("[DONE]"))
                        {
                            var doneMessage = "data: [DONE]\n\n";
                            await Response.WriteAsync(doneMessage);
                            await Response.Body.FlushAsync();
                            break;
                        }

                        else
                        {
                            // 正常发送其他消息
                            var message = $"data: {line}\n\n";
                            Console.WriteLine(message);
                            await Response.WriteAsync(message);
                            await Response.Body.FlushAsync();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                var errorMessage = $"data: Error: {ex.Message}\n\n";
                await Response.WriteAsync(errorMessage);
                await Response.Body.FlushAsync();
            }
            finally
            {
                Response.Body.Close();
            }
        }
    }

    // 请求模型
    public class ChatRequestModel
    {
        public string message { get; set; }
        public string user_id { get; set; }
        public string conversation_id { get; set; } // 新增
    }

}
