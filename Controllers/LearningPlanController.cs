using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Net.Http.Headers;
using System.Text;
using test4.Models;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace test4.Controllers
{
    [ApiController]
    [Route("LearningPlan")]
    public class LearningPlanController : ControllerBase
    {
        private readonly AcademicDbContext _context;

        public LearningPlanController(AcademicDbContext context)
        {
            _context = context;
        }

        [HttpPost("Generate")]
        public async Task<IActionResult> GeneratePlan([FromBody] LearningPlanRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.StudentAccount) || string.IsNullOrEmpty(request.Subject))
            {
                return BadRequest(new { code = 400, msg = "缺少必要参数" });
            }

            try
            {
                // 获取学生的所有相关会话
                var conversations = await _context.StudentConversations
                    .Where(c => c.StudentAccount == request.StudentAccount && c.Subject == request.Subject)
                    .ToListAsync();

                if (conversations == null || !conversations.Any())
                {
                    return BadRequest(new { code = 400, msg = "未找到学生的相关会话数据" });
                }

                // 构建学生进度数据
                var studentProgress = new List<object>();
                var studentQuestions = new List<string>();

                foreach (var conversation in conversations)
                {
                    // 尝试解析知识点
                    List<string> knowledgePoints = new List<string>();
                    if (!string.IsNullOrEmpty(conversation.KnowledgePoints))
                    {
                        try
                        {
                            knowledgePoints = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints);
                        }
                        catch
                        {
                            knowledgePoints = new List<string>();
                        }
                    }

                    // 添加学生进度
                    studentProgress.Add(new
                    {
                        questionCount = conversation.QuestionCount,
                        knowledgePoints = knowledgePoints,
                        understandingStatus = conversation.UnderstandingStatus ?? "正在学习中"
                    });

                    // 获取该会话的人类提问
                    var questions = await _context.ChatMessages
                        .Where(m => m.ConversationId == conversation.Conversation_id && m.MessageType == "human")
                        .Select(m => m.Message)
                        .ToListAsync();

                    studentQuestions.AddRange(questions);
                }

                // 限制问题数量以避免请求过大
                if (studentQuestions.Count > 20)
                {
                    studentQuestions = studentQuestions.Take(20).ToList();
                }

                // 访问 Coze API 生成学习计划
                var planData = await GeneratePlanFromCoze(request.Duration, studentProgress, studentQuestions);

                if (planData == null)
                {
                    return StatusCode(500, new { code = 500, msg = "生成学习计划失败" });
                }

                // 创建学习计划记录
                var learningPlan = new LearningPlan
                {
                    StudentAccount = request.StudentAccount,
                    Subject = request.Subject,
                    Title = $"{request.Subject}学习计划 - {DateTime.Now.ToString("yyyy-MM-dd")}",
                    StartDate = DateTime.Now,
                    EndDate = DateTime.Now.AddDays(request.Duration),
                    Duration = request.Duration,
                    RecommendedPath = planData.RecommendedPath,
                    CreatedTime = DateTime.Now,
                    Status = "进行中"
                };

                _context.LearningPlans.Add(learningPlan);
                await _context.SaveChangesAsync();

                // 创建任务记录
                foreach (var day in planData.DailyTasks)
                {
                    var dayDate = DateTime.Parse(day.Date);

                    foreach (var task in day.Tasks)
                    {
                        var planTask = new LearningPlanTask
                        {
                            PlanId = learningPlan.Id,
                            TaskDate = dayDate,
                            TaskId = task.Id,
                            Subject = task.Subject,
                            KnowledgePoint = task.Point,
                            Content = task.Content,
                            Difficulty = task.Difficulty,
                            Completed = false,
                            Reflection = ""

                        };

                        _context.LearningPlanTasks.Add(planTask);
                    }
                }

                await _context.SaveChangesAsync();

                // 返回学习计划
                return Ok(new
                {
                    code = 0,
                    msg = "学习计划生成成功",
                    data = new
                    {
                        planId = learningPlan.Id,
                        title = learningPlan.Title,
                        startDate = learningPlan.StartDate,
                        endDate = learningPlan.EndDate,
                        recommendedPath = learningPlan.RecommendedPath,
                        dailyTasks = planData.DailyTasks
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"生成学习计划错误: {ex.Message}");
                Console.WriteLine($"堆栈跟踪: {ex.StackTrace}");
                return StatusCode(500, new { code = 500, msg = "服务器内部错误", error = ex.Message });
            }
        }

        [HttpGet("GetPlans")]
        public async Task<IActionResult> GetStudentPlans(string studentAccount)
        {
            if (string.IsNullOrEmpty(studentAccount))
            {
                return BadRequest(new { code = 400, msg = "缺少学生账号" });
            }

            try
            {
                var plans = await _context.LearningPlans
                    .Where(p => p.StudentAccount == studentAccount)
                    .OrderByDescending(p => p.CreatedTime)
                    .Select(p => new
                    {
                        p.Id,
                        p.Title,
                        p.Subject,
                        p.StartDate,
                        p.EndDate,
                        p.Status,
                        p.RecommendedPath
                    })
                    .ToListAsync();

                return Ok(new { code = 0, msg = "获取学习计划成功", data = plans });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "服务器内部错误", error = ex.Message });
            }
        }

        [HttpGet("GetPlanDetails")]
        public async Task<IActionResult> GetPlanDetails(int planId)
        {
            if (planId <= 0)
            {
                return BadRequest(new { code = 400, msg = "无效的计划ID" });
            }

            try
            {
                var plan = await _context.LearningPlans
                    .Where(p => p.Id == planId)
                    .FirstOrDefaultAsync();

                if (plan == null)
                {
                    return NotFound(new { code = 404, msg = "学习计划不存在" });
                }

                var tasks = await _context.LearningPlanTasks
                    .Where(t => t.PlanId == planId)
                    .OrderBy(t => t.TaskDate)
                    .ThenBy(t => t.Id)
                    .ToListAsync();

                // 按日期分组任务
                var dailyTasks = tasks
                    .GroupBy(t => t.TaskDate.Date)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-dd"),
                        tasks = g.Select(t => new
                        {
                            id = t.TaskId,
                            subject = t.Subject,
                            point = t.KnowledgePoint,
                            content = t.Content,
                            difficulty = t.Difficulty,
                            completed = t.Completed,
                            completionDate = t.CompletionDate,
                            reflection = t.Reflection
                        }).ToList()
                    })
                    .ToList();

                return Ok(new
                {
                    code = 0,
                    msg = "获取学习计划详情成功",
                    data = new
                    {
                        plan = new
                        {
                            plan.Id,
                            plan.Title,
                            plan.Subject,
                            plan.StartDate,
                            plan.EndDate,
                            plan.Duration,
                            plan.Status,
                            plan.RecommendedPath,
                            plan.CreatedTime
                        },
                        dailyTasks = dailyTasks
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "服务器内部错误", error = ex.Message });
            }
        }

        [HttpPost("UpdateTaskStatus")]
        public async Task<IActionResult> UpdateTaskStatus([FromBody] UpdateTaskStatusRequest request)
        {
            if (request == null || request.PlanId <= 0 || string.IsNullOrEmpty(request.TaskId))
            {
                return BadRequest(new { code = 400, msg = "缺少必要参数" });
            }

            try
            {
                var task = await _context.LearningPlanTasks
                    .Where(t => t.PlanId == request.PlanId && t.TaskId == request.TaskId)
                    .FirstOrDefaultAsync();

                if (task == null)
                {
                    return NotFound(new { code = 404, msg = "任务不存在" });
                }

                task.Completed = request.Completed;

                // 如果标记为完成，记录完成时间
                if (request.Completed && !task.CompletionDate.HasValue)
                {
                    task.CompletionDate = DateTime.Now;
                }
                // 如果标记为未完成，清除完成时间
                else if (!request.Completed)
                {
                    task.CompletionDate = null;
                }

                // 更新学习心得
                if (!string.IsNullOrEmpty(request.Reflection))
                {
                    task.Reflection = request.Reflection;
                }

                await _context.SaveChangesAsync();

                return Ok(new { code = 0, msg = "更新任务状态成功" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = "服务器内部错误", error = ex.Message });
            }
        }
        private PlanResponse ManualParseJson(string jsonString)
        {
            try
            {
                // 首先处理Markdown格式
                if (jsonString.StartsWith("```json") || jsonString.StartsWith("```"))
                {
                    var startIndex = jsonString.IndexOf('{');
                    var endIndex = jsonString.LastIndexOf('}');

                    if (startIndex >= 0 && endIndex >= 0 && endIndex > startIndex)
                    {
                        jsonString = jsonString.Substring(startIndex, endIndex - startIndex + 1);
                    }
                }

                // 直接尝试反序列化完整对象
                try
                {
                    var response = JsonConvert.DeserializeObject<PlanResponse>(jsonString);
                    if (response != null && response.DailyTasks != null && response.DailyTasks.Count > 0)
                    {
                        return response;
                    }
                }
                catch
                {
                    // 继续使用手动解析
                }

                // 初始化响应对象
                var planResponse = new PlanResponse
                {
                    DailyTasks = new List<DailyTask>()
                };

                // 提取recommendedPath
                var recommendedPathMatch = System.Text.RegularExpressions.Regex.Match(
                    jsonString, "\"recommendedPath\"\\s*:\\s*\"([^\"]+)\"");

                if (recommendedPathMatch.Success)
                {
                    planResponse.RecommendedPath = recommendedPathMatch.Groups[1].Value;
                }

                // 提取dailyTasks数组
                var dailyTasksMatch = System.Text.RegularExpressions.Regex.Match(
                    jsonString, "\"dailyTasks\"\\s*:\\s*(\\[.+?\\])",
                    System.Text.RegularExpressions.RegexOptions.Singleline);

                if (dailyTasksMatch.Success)
                {
                    var dailyTasksJson = dailyTasksMatch.Groups[1].Value;
                    try
                    {
                        var dailyTasks = JsonConvert.DeserializeObject<List<DailyTask>>(dailyTasksJson);
                        if (dailyTasks != null)
                        {
                            planResponse.DailyTasks = dailyTasks;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"解析dailyTasks数组失败: {ex.Message}");

                        // 尝试逐个解析每个日期项
                        var dayMatches = System.Text.RegularExpressions.Regex.Matches(
                            dailyTasksJson, "{\\s*\"date\"[^}]+\"tasks\"\\s*:\\s*(\\[.+?\\])\\s*}",
                            System.Text.RegularExpressions.RegexOptions.Singleline);

                        foreach (System.Text.RegularExpressions.Match dayMatch in dayMatches)
                        {
                            var dayJson = dayMatch.Value;
                            try
                            {
                                var day = JsonConvert.DeserializeObject<DailyTask>(dayJson);
                                if (day != null)
                                {
                                    planResponse.DailyTasks.Add(day);
                                }
                            }
                            catch
                            {
                                // 进一步细分解析
                                var dateMatch = System.Text.RegularExpressions.Regex.Match(
                                    dayJson, "\"date\"\\s*:\\s*\"([^\"]+)\"");

                                var tasksMatch = System.Text.RegularExpressions.Regex.Match(
                                    dayJson, "\"tasks\"\\s*:\\s*(\\[.+?\\])",
                                    System.Text.RegularExpressions.RegexOptions.Singleline);

                                if (dateMatch.Success && tasksMatch.Success)
                                {
                                    var day = new DailyTask
                                    {
                                        Date = dateMatch.Groups[1].Value,
                                        Tasks = new List<TaskItem>()
                                    };

                                    var tasksJson = tasksMatch.Groups[1].Value;
                                    var taskMatches = System.Text.RegularExpressions.Regex.Matches(
                                        tasksJson, "{[^{}]+}",
                                        System.Text.RegularExpressions.RegexOptions.Singleline);

                                    foreach (System.Text.RegularExpressions.Match taskMatch in taskMatches)
                                    {
                                        try
                                        {
                                            var task = JsonConvert.DeserializeObject<TaskItem>(taskMatch.Value);
                                            if (task != null)
                                            {
                                                day.Tasks.Add(task);
                                            }
                                        }
                                        catch
                                        {
                                            // 最后的手段：手动提取每个字段
                                            var task = ParseTaskItemManually(taskMatch.Value);
                                            if (task != null)
                                            {
                                                day.Tasks.Add(task);
                                            }
                                        }
                                    }

                                    planResponse.DailyTasks.Add(day);
                                }
                            }
                        }
                    }
                }

                return planResponse;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"手动解析错误: {ex.Message}");
                Console.WriteLine($"异常堆栈: {ex.StackTrace}");
                return new PlanResponse
                {
                    RecommendedPath = "解析失败，请重试",
                    DailyTasks = new List<DailyTask>()
                };
            }
        }

        private TaskItem ParseTaskItemManually(string taskJson)
        {
            var task = new TaskItem();

            // 使用正则表达式提取各个字段
            var idMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"id\"\\s*:\\s*\"([^\"]+)\"");
            var subjectMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"subject\"\\s*:\\s*\"([^\"]+)\"");
            var pointMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"point\"\\s*:\\s*\"([^\"]+)\"");
            var contentMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"content\"\\s*:\\s*\"([^\"]+)\"");
            var difficultyMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"difficulty\"\\s*:\\s*\"([^\"]+)\"");
            var completedMatch = System.Text.RegularExpressions.Regex.Match(taskJson, "\"completed\"\\s*:\\s*(true|false)");

            // 赋值
            if (idMatch.Success) task.Id = idMatch.Groups[1].Value;
            if (subjectMatch.Success) task.Subject = subjectMatch.Groups[1].Value;
            if (pointMatch.Success) task.Point = pointMatch.Groups[1].Value;
            if (contentMatch.Success) task.Content = contentMatch.Groups[1].Value;
            if (difficultyMatch.Success) task.Difficulty = difficultyMatch.Groups[1].Value;
            if (completedMatch.Success) task.Completed = bool.Parse(completedMatch.Groups[1].Value);

            return task;
        }

        private List<string> SplitJsonArray(string arrayString)
        {
            var result = new List<string>();
            int depth = 0;
            int start = 0;

            for (int i = 0; i < arrayString.Length; i++)
            {
                if (arrayString[i] == '{')
                {
                    if (depth == 0) start = i;
                    depth++;
                }
                else if (arrayString[i] == '}')
                {
                    depth--;
                    if (depth == 0)
                    {
                        result.Add(arrayString.Substring(start, i - start + 1));
                    }
                }
            }

            return result;
        }

        private DailyTask ParseDailyTask(string dailyTaskString)
        {
            var dailyTask = new DailyTask
            {
                Tasks = new List<TaskItem>()
            };

            // 提取日期
            var dateMatch = System.Text.RegularExpressions.Regex.Match(dailyTaskString, "\"date\":\"([^\"]+)\"");
            if (dateMatch.Success)
            {
                dailyTask.Date = dateMatch.Groups[1].Value;
            }

            // 提取任务
            var tasksMatch = System.Text.RegularExpressions.Regex.Match(dailyTaskString, "\"tasks\":\\[(.*?)\\]", System.Text.RegularExpressions.RegexOptions.Singleline);
            if (tasksMatch.Success)
            {
                var tasksString = tasksMatch.Groups[1].Value;
                var taskStrings = SplitJsonArray(tasksString);

                foreach (var taskString in taskStrings)
                {
                    var task = ParseTaskItem(taskString);
                    if (task != null)
                    {
                        dailyTask.Tasks.Add(task);
                    }
                }
            }

            return dailyTask;
        }

        private TaskItem ParseTaskItem(string taskString)
        {
            var task = new TaskItem();

            // 使用正则表达式提取各个字段
            var idMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"id\":\"([^\"]+)\"");
            var subjectMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"subject\":\"([^\"]+)\"");
            var pointMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"point\":\"([^\"]+)\"");
            var contentMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"content\":\"([^\"]+)\"");
            var difficultyMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"difficulty\":\"([^\"]+)\"");
            var completedMatch = System.Text.RegularExpressions.Regex.Match(taskString, "\"completed\":(true|false)");

            // 赋值
            task.Id = idMatch.Success ? idMatch.Groups[1].Value : null;
            task.Subject = subjectMatch.Success ? subjectMatch.Groups[1].Value : null;
            task.Point = pointMatch.Success ? pointMatch.Groups[1].Value : null;
            task.Content = contentMatch.Success ? contentMatch.Groups[1].Value : null;
            task.Difficulty = difficultyMatch.Success ? difficultyMatch.Groups[1].Value : null;
            task.Completed = completedMatch.Success && bool.Parse(completedMatch.Groups[1].Value);

            return task;
        }
        private async Task<PlanResponse> GeneratePlanFromCoze(int planDuration, List<object> studentProgress, List<string> studentQuestions)
        {
            var apiUrl = "https://api.coze.com/v1/workflow/run";
            var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";
            var workflowId = "7488480363745886213";
            string startDate = DateTime.Now.ToString("yyyy-MM-dd");

            using (var httpClient = new HttpClient())
            {
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // 修改这里的JSON结构，确保workflow_id和parameters是同级的
                var payload = new
                {
                    workflow_id = workflowId,  // 与parameters同级
                    parameters = new
                    {
                        planDuration = planDuration,
                        studentProgress = studentProgress,
                        studentQuestion = studentQuestions,
                        startDate=startDate
                    }
                };
                // 序列化并打印完整请求
                string fullPayload = JsonConvert.SerializeObject(payload, Formatting.Indented);
                Console.WriteLine($"发送到 Coze API 的完整请求内容:\n{fullPayload}");

                // 添加详细日志
                string payloadJson = JsonConvert.SerializeObject(payload);
                Console.WriteLine($"发送到 Coze API 的请求内容: {payloadJson}");

                var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

                try
                {
                    // 增加超时时间
                    httpClient.Timeout = TimeSpan.FromMinutes(2);

                    var response = await httpClient.PostAsync(apiUrl, content);
                    var responseContent = await response.Content.ReadAsStringAsync();

                    Console.WriteLine($"Coze API响应状态码: {response.StatusCode}");
                    Console.WriteLine($"Coze API响应内容: {responseContent}");

                    if (!response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"Coze API错误: {response.StatusCode}, 响应内容: {responseContent}");
                        return null;
                    }

                    // 然后在 GeneratePlanFromCoze 方法中修改解析逻辑：

                    var cozeResponse = JsonConvert.DeserializeObject<CozeWorkflowResponse>(responseContent);

                    if (cozeResponse?.Code != 0 || string.IsNullOrEmpty(cozeResponse?.Data))
                    {
                        Console.WriteLine($"Coze API返回了无效的响应格式: {responseContent}");
                        return null;
                    }
                    // 首先解析 data 字符串获取 output
                    var dataObject = JsonConvert.DeserializeObject<DataObject>(cozeResponse.Data);

                    if (dataObject?.Output == null || string.IsNullOrEmpty(dataObject.Output))
                    {
                        Console.WriteLine($"无法从Coze响应中获取output字段: {cozeResponse.Data}");
                        return null;
                    }
                    // 解析生成的计划
                    // 然后解析 output 字符串获取计划数据
                    try
                    {
                        // 使用手动解析方法
                        var planData = ManualParseJson(dataObject.Output);

                        if (planData == null)
                        {
                            Console.WriteLine("手动解析 JSON 失败");
                            return null;
                        }

                        // 打印解析结果
                        Console.WriteLine($"推荐路径: {planData.RecommendedPath}");
                        Console.WriteLine($"总天数: {planData.DailyTasks.Count}");

                        foreach (var day in planData.DailyTasks)
                        {
                            Console.WriteLine($"日期: {day.Date}, 任务数: {day.Tasks.Count}");
                            foreach (var task in day.Tasks)
                            {
                                Console.WriteLine($"  - 任务: {task.Content}, 难度: {task.Difficulty}, 科目: {task.Subject}");
                            }
                        }

                        return planData;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"解析错误: {ex.Message}");
                        Console.WriteLine($"异常堆栈: {ex.StackTrace}");
                        return null;
                    }


                }
                catch (Exception ex)
                {
                    Console.WriteLine($"调用Coze API错误: {ex.Message}");
                    Console.WriteLine($"异常堆栈: {ex.StackTrace}");
                    return null;
                }
            }
        }
    }
    // 添加这个中间类用于解析 data 字段
    public class DataObject
    {
        [JsonProperty("output")]
        public string Output { get; set; }
    }
    // 请求模型
    public class LearningPlanRequest
    {
        public string StudentAccount { get; set; }
        public string Subject { get; set; } // 学科
        public int Duration { get; set; } // 持续天数
    }

    public class UpdateTaskStatusRequest
    {
        public int PlanId { get; set; }
        public string TaskId { get; set; }
        public bool Completed { get; set; }
        public string ?Reflection { get; set; }
    }

    // 响应模型
    public class CozeWorkflowResponse
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("data")]
        public string Data { get; set; }  // 注意这里是字符串类型

        [JsonProperty("msg")]
        public string Msg { get; set; }

        [JsonProperty("cost")]
        public string Cost { get; set; }

        [JsonProperty("debug_url")]
        public string DebugUrl { get; set; }

        [JsonProperty("token")]
        public int Token { get; set; }
    }

    public class CozeResponseData
    {
        [JsonProperty("output")]
        public string Output { get; set; }
    }

    public class PlanResponse
    {
        [JsonProperty("recommendedPath")]
        public string RecommendedPath { get; set; }

        [JsonProperty("dailyTasks")]
        public List<DailyTask> DailyTasks { get; set; }
    }

    public class DailyTask
    {
        [JsonProperty("date")]
        public string Date { get; set; }

        [JsonProperty("tasks")]
        public List<TaskItem> Tasks { get; set; }
    }

    public class TaskItem
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("subject")]
        public string Subject { get; set; }

        [JsonProperty("point")]
        public string Point { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        [JsonProperty("difficulty")]
        public string Difficulty { get; set; }

        [JsonProperty("completed")]
        public bool Completed { get; set; }
    }
}