using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;
using System.Net.Http.Headers;
using Newtonsoft.Json;
using test4.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace test4.Controllers
{
    [ApiController]
    [Route("Conversation")]
    public class ConversationController : ControllerBase
    {
        private readonly AcademicDbContext _dbContext;

        public ConversationController(AcademicDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] ConversationRequestModel request)
        {
            // 验证请求数据
            if (request == null || string.IsNullOrWhiteSpace(request.StudentAccount) || string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            // 添加日志，输出接收到的请求数据
            Console.WriteLine($"Received request: StudentAccount={request.StudentAccount}, Subject={request.Subject}, Title={request.Title}");

            // 设置 Coze API 的 URL 和访问令牌
            var apiUrl = "https://api.coze.com/v1/conversation/create";
            var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj"; // 请替换为您的实际访问令牌

            using (var httpClient = new HttpClient())
            {
                httpClient.Timeout = TimeSpan.FromMinutes(1);
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var cozeRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl);
                cozeRequest.Content = new StringContent("{}", Encoding.UTF8, "application/json");

                try
                {
                    var cozeResponse = await httpClient.SendAsync(cozeRequest);
                    var cozeResponseContent = await cozeResponse.Content.ReadAsStringAsync();

                    // 添加日志，输出 Coze API 的响应状态码和内容
                    Console.WriteLine($"Coze API Response Status Code: {cozeResponse.StatusCode}");
                    Console.WriteLine($"Coze API Response Content: {cozeResponseContent}");

                    if (!cozeResponse.IsSuccessStatusCode)
                    {
                        // 返回 Coze API 返回的错误信息
                        return StatusCode((int)cozeResponse.StatusCode, new { code = (int)cozeResponse.StatusCode, msg = "Failed to create conversation", error = cozeResponseContent });
                    }

                    // 解析 Coze API 的响应
                    var apiResponse = JsonConvert.DeserializeObject<ConversationApiResponse>(cozeResponseContent);

                    if (apiResponse == null || apiResponse.Data == null)
                    {
                        return BadRequest(new { code = 500, msg = "Invalid API response", error = cozeResponseContent });
                    }

                    // 将数据存入数据库
                    var newConversation = new StudentConversation
                    {
                        StudentAccount = request.StudentAccount,
                        Conversation_id = apiResponse.Data.Id,
                        Subject = request.Subject,
                        Title = request.Title,
                        QuestionCount = 0,
                        KnowledgePoints = "[]" // 添加这一行，设置为空数组的 JSON 字符串
                    };

                    _dbContext.StudentConversations.Add(newConversation);
                    await _dbContext.SaveChangesAsync();

                    // 返回响应给前端
                    return Ok(new { code = 0, msg = "Conversation created successfully", data = newConversation });
                }
                catch (Exception ex)
                {
                    // 捕获异常，输出错误信息
                    Console.WriteLine($"Error when calling Coze API: {ex.Message}");
                    return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
                }
            }
        }
        [HttpDelete("Delete/{conversationId}")]
        public async Task<IActionResult> Delete(string conversationId)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid conversation ID" });
            }

            var conversation = await _dbContext.StudentConversations
                .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);
            if (conversation == null)
            {
                return NotFound(new { code = 404, msg = "Conversation not found" });
            }

            _dbContext.StudentConversations.Remove(conversation);
            await _dbContext.SaveChangesAsync();

            return Ok(new { code = 0, msg = "Conversation deleted successfully" });
        }

        [HttpPut("UpdateTitle/{conversationId}")]
        public async Task<IActionResult> UpdateTitle(string conversationId, [FromBody] UpdateTitleRequestModel request)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid conversation ID" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            var conversation = await _dbContext.StudentConversations
                .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);
            if (conversation == null)
            {
                return NotFound(new { code = 404, msg = "Conversation not found" });
            }

            conversation.Title = request.Title;
            await _dbContext.SaveChangesAsync();

            return Ok(new { code = 0, msg = "Conversation title updated successfully" });
        }
        [HttpPost("DetectKnowledgePoints")]
        public async Task<IActionResult> DetectKnowledgePoints([FromBody] KnowledgePointsRequestModel request)
        {
            // 验证请求数据
            if (request == null || string.IsNullOrWhiteSpace(request.Question) || string.IsNullOrWhiteSpace(request.ConversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            try
            {
                // 获取所有教案名称
                var lessonNames = await _dbContext.LessonPlans
                    .Select(lp => lp.LessonName)
                    .ToListAsync();

                // 构建请求体
                var apiUrl = "https://api.coze.com/v1/workflow/run";
                var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";
                var workflowId = "7471602258649088055";

                var payload = new
                {
                    workflow_id = workflowId,
                    parameters = new
                    {
                        lessonplan_name = lessonNames,
                        question = request.Question
                    }
                };

                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var cozeRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl);
                    cozeRequest.Content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");

                    var cozeResponse = await httpClient.SendAsync(cozeRequest);
                    var cozeResponseContent = await cozeResponse.Content.ReadAsStringAsync();

                    if (!cozeResponse.IsSuccessStatusCode)
                    {
                        return StatusCode((int)cozeResponse.StatusCode, new { code = (int)cozeResponse.StatusCode, msg = "Failed to detect knowledge points", error = cozeResponseContent });
                    }

                    // 解析 Coze API 的响应
                    var apiResponse = JsonConvert.DeserializeObject<CozeKnowledgePointsResponse>(cozeResponseContent);

                    if (apiResponse?.Data == null)
                    {
                        return BadRequest(new { code = 500, msg = "Invalid API response", error = cozeResponseContent });
                    }

                    // 解析 data 字段中的 output 数组
                    var dataObject = JsonConvert.DeserializeObject<CozeKnowledgePointsData>(apiResponse.Data);

                    if (dataObject?.Output == null || dataObject.Output.Count == 0)
                    {
                        return Ok(new { code = 0, msg = "No knowledge points detected", data = new List<string>() });
                    }

                    // 更新会话的知识点
                    var conversation = await _dbContext.StudentConversations
                        .FirstOrDefaultAsync(c => c.Conversation_id == request.ConversationId);

                    if (conversation != null)
                    {
                        // 保存知识点到会话
                        conversation.KnowledgePoints = JsonConvert.SerializeObject(dataObject.Output);
                        await _dbContext.SaveChangesAsync();
                    }

                    // 返回知识点
                    return Ok(new { code = 0, msg = "Knowledge points detected", data = dataObject.Output });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
            }
        }
        [HttpGet("GetConversationKnowledgePoints")]
        public async Task<IActionResult> GetConversationKnowledgePoints(string conversationId)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid conversation ID" });
            }

            try
            {
                var conversation = await _dbContext.StudentConversations
                    .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);

                if (conversation == null)
                {
                    return NotFound(new { code = 404, msg = "Conversation not found" });
                }

                List<string> knowledgePoints = new List<string>();

                // 如果存在知识点字段且不为空，则解析JSON
                if (!string.IsNullOrEmpty(conversation.KnowledgePoints))
                {
                    try
                    {
                        knowledgePoints = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints);
                    }
                    catch
                    {
                        // 解析出错，返回空列表
                        knowledgePoints = new List<string>();
                    }
                }

                return Ok(new { code = 0, msg = "Success", data = knowledgePoints });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
            }
        }
        [HttpPost("CreateWithKnowledgePoints")]
        public async Task<IActionResult> CreateWithKnowledgePoints([FromBody] ConversationWithKnowledgePointsRequestModel request)
        {
            // 验证请求数据
            if (request == null || string.IsNullOrWhiteSpace(request.StudentAccount) ||
                string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            // 添加日志
            Console.WriteLine($"Received request: StudentAccount={request.StudentAccount}, Subject={request.Subject}, Title={request.Title}");

            // 设置 Coze API 的 URL 和访问令牌
            var apiUrl = "https://api.coze.com/v1/conversation/create";
            var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";

            using (var httpClient = new HttpClient())
            {
                httpClient.Timeout = TimeSpan.FromMinutes(1);
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var cozeRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl);
                cozeRequest.Content = new StringContent("{}", Encoding.UTF8, "application/json");

                try
                {
                    var cozeResponse = await httpClient.SendAsync(cozeRequest);
                    var cozeResponseContent = await cozeResponse.Content.ReadAsStringAsync();

                    if (!cozeResponse.IsSuccessStatusCode)
                    {
                        return StatusCode((int)cozeResponse.StatusCode, new { code = (int)cozeResponse.StatusCode, msg = "Failed to create conversation", error = cozeResponseContent });
                    }

                    // 解析 Coze API 的响应
                    var apiResponse = JsonConvert.DeserializeObject<ConversationApiResponse>(cozeResponseContent);

                    if (apiResponse == null || apiResponse.Data == null)
                    {
                        return BadRequest(new { code = 500, msg = "Invalid API response", error = cozeResponseContent });
                    }

                    // 将知识点数组转换为 JSON 字符串
                    string knowledgePointsJson = JsonConvert.SerializeObject(request.KnowledgePoints ?? new List<string>());

                    // 将数据存入数据库
                    var newConversation = new StudentConversation
                    {
                        StudentAccount = request.StudentAccount,
                        Conversation_id = apiResponse.Data.Id,
                        Subject = request.Subject,
                        Title = request.Title,
                        QuestionCount = 0,
                        KnowledgePoints = knowledgePointsJson,
                        CreatedTime = DateTime.Now, // 设置创建时间为当前时间
                        UnderstandingStatus = "正在学习中" // 设置默认理解状态
                    };

                    _dbContext.StudentConversations.Add(newConversation);
                    await _dbContext.SaveChangesAsync();

                    // 如果有初始问题，发送到 Coze 并保存聊天记录
                    if (!string.IsNullOrEmpty(request.InitialQuestion))
                    {
                        try
                        {
                            // 保存用户问题到聊天记录
                            var chatMessage = new ChatMessage
                            {
                                ConversationId = apiResponse.Data.Id,
                                Message = request.InitialQuestion,
                                MessageType = "human",
                                Timestamp = DateTime.UtcNow
                            };

                            _dbContext.ChatMessages.Add(chatMessage);
                            await _dbContext.SaveChangesAsync();

                            // 这里可以添加调用 Coze API 获取回答的代码
                            // 但这部分通常由前端在会话加载后处理
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error saving initial question: {ex.Message}");
                            // 这里只记录错误，不影响创建会话的成功返回
                        }
                    }

                    // 返回响应给前端
                    return Ok(new
                    {
                        code = 0,
                        msg = "Conversation created successfully",
                        data = new
                        {
                            conversation_id = newConversation.Conversation_id,
                            title = newConversation.Title,
                            knowledge_points = request.KnowledgePoints
                        }
                    });
                }
                catch (Exception ex)
                {
                    // 捕获异常，输出错误信息
                    Console.WriteLine($"Error when creating conversation: {ex.Message}");
                    return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
                }
            }
        }
        [HttpPost("DetectKnowledgePointsDirectly")]
        public async Task<IActionResult> DetectKnowledgePointsDirectly([FromBody] KnowledgePointsDirectRequestModel request)
        {
            // 验证请求数据
            if (request == null || string.IsNullOrWhiteSpace(request.Question) ||
                string.IsNullOrWhiteSpace(request.StudentAccount) ||
                string.IsNullOrWhiteSpace(request.Subject))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            try
            {
                // 获取所有教案名称
                var lessonNames = await _dbContext.LessonPlans
                    .Select(lp => lp.LessonName)
                    .ToListAsync();

                // 如果没有教案，返回空结果
                if (lessonNames == null || !lessonNames.Any())
                {
                    return Ok(new { code = 0, msg = "No lesson plans found", data = new List<string>() });
                }

                // 构建请求体
                var apiUrl = "https://api.coze.com/v1/workflow/run";
                var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";
                var workflowId = "7471602258649088055";

                var payload = new
                {
                    workflow_id = workflowId,
                    parameters = new
                    {
                        lessonplan_name = lessonNames,
                        question = request.Question
                    }
                };

                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
                    Console.WriteLine($"Request payload: {await content.ReadAsStringAsync()}");

                    var cozeResponse = await httpClient.PostAsync(apiUrl, content);
                    var cozeResponseContent = await cozeResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"Coze API Response: {cozeResponseContent}");

                    if (!cozeResponse.IsSuccessStatusCode)
                    {
                        return StatusCode((int)cozeResponse.StatusCode, new
                        {
                            code = (int)cozeResponse.StatusCode,
                            msg = "Failed to detect knowledge points",
                            error = cozeResponseContent
                        });
                    }

                    // 解析 Coze API 的响应
                    var apiResponse = JsonConvert.DeserializeObject<CozeKnowledgePointsResponse>(cozeResponseContent);

                    if (apiResponse?.Data == null)
                    {
                        return BadRequest(new
                        {
                            code = 500,
                            msg = "Invalid API response",
                            error = cozeResponseContent
                        });
                    }

                    // 解析 data 字段中的 output 数组
                    var dataObject = JsonConvert.DeserializeObject<CozeKnowledgePointsData>(apiResponse.Data);

                    if (dataObject?.Output == null || dataObject.Output.Count == 0)
                    {
                        return Ok(new { code = 0, msg = "No knowledge points detected", data = new List<string>() });
                    }

                    // 返回知识点
                    return Ok(new { code = 0, msg = "Knowledge points detected", data = dataObject.Output });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DetectKnowledgePointsDirectly: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
            }
        }
        [HttpGet("GetConversationInfo")]
        public async Task<IActionResult> GetConversationInfo(string conversationId)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid conversation ID" });
            }

            try
            {
                // 获取会话信息
                var conversation = await _dbContext.StudentConversations
                    .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);

                if (conversation == null)
                {
                    return NotFound(new { code = 404, msg = "Conversation not found" });
                }

                // 解析知识点
                List<string> knowledgePoints = new List<string>();
                if (!string.IsNullOrEmpty(conversation.KnowledgePoints))
                {
                    try
                    {
                        knowledgePoints = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints);
                    }
                    catch
                    {
                        // 如果解析失败，返回空列表
                        knowledgePoints = new List<string>();
                    }
                }

                // 获取该会话的第一条人类消息作为初始问题
                string initialQuestion = null;
                var firstMessage = await _dbContext.ChatMessages
                    .Where(m => m.ConversationId == conversationId && m.MessageType == "human")
                    .OrderBy(m => m.Timestamp)
                    .FirstOrDefaultAsync();

                if (firstMessage != null)
                {
                    initialQuestion = firstMessage.Message;
                }

                // 返回会话信息
                return Ok(new
                {
                    code = 0,
                    msg = "Success",
                    data = new
                    {
                        title = conversation.Title,
                        subject = conversation.Subject,
                        knowledgePoints = knowledgePoints,
                        initialQuestion = initialQuestion,
                        createdTime = conversation.CreatedTime,
                        understandingStatus = conversation.UnderstandingStatus
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "Internal server error", error = ex.Message });
            }
        }
        [HttpPut("UpdateUnderstandingStatus/{conversationId}")]
        public async Task<IActionResult> UpdateUnderstandingStatus(string conversationId, [FromBody] UpdateUnderstandingStatusRequestModel request)
        {
            if (string.IsNullOrEmpty(conversationId))
            {
                return BadRequest(new { code = 400, msg = "Invalid conversation ID" });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.UnderstandingStatus))
            {
                return BadRequest(new { code = 400, msg = "Invalid request data" });
            }

            // 验证状态值是否有效
            var validStatuses = new[] { "已透彻理解", "正在学习中", "难以理解" };
            if (!validStatuses.Contains(request.UnderstandingStatus))
            {
                return BadRequest(new { code = 400, msg = "Invalid understanding status. Valid values are: 已透彻理解, 正在学习中, 难以理解" });
            }

            var conversation = await _dbContext.StudentConversations
                .FirstOrDefaultAsync(c => c.Conversation_id == conversationId);
            if (conversation == null)
            {
                return NotFound(new { code = 404, msg = "Conversation not found" });
            }

            conversation.UnderstandingStatus = request.UnderstandingStatus;
            await _dbContext.SaveChangesAsync();

            return Ok(new { code = 0, msg = "Understanding status updated successfully" });
        }
    }// 添加请求模型类
    public class UpdateUnderstandingStatusRequestModel
    {
        [Required]
        public string UnderstandingStatus { get; set; }
    }
    public class KnowledgePointsDirectRequestModel
    {
        [Required]
        public string Question { get; set; }

        [Required]
        public string StudentAccount { get; set; }

        [Required]
        public string Subject { get; set; }
    }
    // 请求模型
    public class ConversationWithKnowledgePointsRequestModel
    {
        [Required]
        public string StudentAccount { get; set; }

        [Required]
        public string Subject { get; set; }

        [Required]
        public string Title { get; set; }

        public List<string> KnowledgePoints { get; set; }

        public string InitialQuestion { get; set; }
    }
    public class ConversationRequestModel
    {
        [Required]
        public string StudentAccount { get; set; } // 学生账号

        [Required]
        public string Subject { get; set; } // 学科

        [Required]
        public string Title { get; set; } // 标题
    }
    public class UpdateTitleRequestModel
    {
        [Required]
        public string Title { get; set; }
    }

    // Coze API 响应模型
    public class ConversationApiResponse
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public ConversationData Data { get; set; }
    }

    public class ConversationData
    {
        [JsonProperty("id")]
        public string Id { get; set; }
    }
    // 在 ConversationController.cs 文件中添加这些类
    public class KnowledgePointsRequestModel
    {
        [Required]
        public string Question { get; set; }

        [Required]
        public string ConversationId { get; set; }
    }

    public class CozeKnowledgePointsResponse
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public string Data { get; set; }

        [JsonProperty("msg")]
        public string Msg { get; set; }
    }

    public class CozeKnowledgePointsData
    {
        [JsonProperty("output")]
        public List<string> Output { get; set; }
    }
}
