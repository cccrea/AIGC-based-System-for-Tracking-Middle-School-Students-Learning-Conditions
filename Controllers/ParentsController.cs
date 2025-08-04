using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using test4.Models;

namespace test4.Controllers
{
    public class ParentsController : Controller
    {
        private readonly AcademicDbContext _context;

        public ParentsController(AcademicDbContext context)
        {
            _context = context;
        }

        // GET: Parents
        public async Task<IActionResult> Index()
        {
            return View(await _context.Parents.ToListAsync());
        }
        // 家长数据看板视图
        public async Task<IActionResult> Dashboard(string parentAccount)
        {
            if (string.IsNullOrEmpty(parentAccount))
            {
                return NotFound();
            }

            // 获取家长信息
            var parent = await _context.Parents.FirstOrDefaultAsync(p => p.Account == parentAccount);
            if (parent == null)
            {
                return NotFound();
            }

            // 获取家长关联的学生（目前先取第一个学生）
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.ParentAccount == parentAccount);

            if (student == null)
            {
                return View("NoStudent"); // 如果没有关联的学生，显示一个提示页面
            }

            // 构建视图模型
            var model = new ParentDashboardViewModel
            {
                ParentName = parent.Name,
                ParentAccount = parent.Account,
                StudentName = student.Name,
                StudentAccount = student.Account
            };

            return View(model);
        }

        // 获取学习统计数据的API
        [HttpGet]
        public async Task<IActionResult> GetLearningStats(string studentAccount, string period, string subject)
        {
            if (string.IsNullOrEmpty(studentAccount))
            {
                return BadRequest(new { code = 400, msg = "学生账号不能为空" });
            }

            try
            {
                // 计算时间范围
                DateTime startDate = GetStartDateByPeriod(period);

                // 准备查询
                var query = _context.StudentConversations.AsQueryable();

                // 根据学生筛选
                query = query.Where(c => c.StudentAccount == studentAccount);

                // 根据时间范围筛选
                if (period != "all")
                {
                    query = query.Where(c => c.CreatedTime >= startDate);
                }

                // 根据学科筛选
                if (subject != "all")
                {
                    if (subject == "chinese")
                    {
                        query = query.Where(c => c.Subject == "语文");
                    }
                    else if (subject == "math")
                    {
                        query = query.Where(c => c.Subject == "数学");
                    }
                    else if (subject == "english")
                    {
                        query = query.Where(c => c.Subject == "英语");
                    }
                    else
                    {
                        query = query.Where(c => c.Subject == subject);
                    }
                }

                // 执行查询
                var conversations = await query.ToListAsync();

                // 获取上一个时间段的数据以计算趋势
                DateTime previousStartDate = GetPreviousStartDate(period, startDate);
                DateTime previousEndDate = startDate.AddSeconds(-1);

                var previousQuery = _context.StudentConversations
                    .Where(c => c.StudentAccount == studentAccount);

                if (period != "all")
                {
                    previousQuery = previousQuery.Where(c => c.CreatedTime >= previousStartDate && c.CreatedTime <= previousEndDate);
                }

                if (subject != "all")
                {
                    previousQuery = previousQuery.Where(c => c.Subject == subject);
                }

                var previousConversations = await previousQuery.ToListAsync();

                // 提取知识点
                var allKnowledgePoints = new HashSet<string>();

                foreach (var conversation in conversations)
                {
                    try
                    {
                        var points = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints ?? "[]");
                        foreach (var point in points)
                        {
                            allKnowledgePoints.Add(point);
                        }
                    }
                    catch
                    {
                        // 解析失败，跳过
                    }
                }

                // 计算理解状态统计
                int understoodCount = conversations.Count(c => c.UnderstandingStatus == "已透彻理解");
                int learningCount = conversations.Count(c => c.UnderstandingStatus == "正在学习中");
                int difficultCount = conversations.Count(c => c.UnderstandingStatus == "难以理解");

                // 计算前一周期的提问数
                int previousQuestionCount = previousConversations.Count;

                // 计算趋势百分比
                double questionTrend = previousQuestionCount > 0
                    ? Math.Round(((double)conversations.Count / previousQuestionCount - 1) * 100, 1)
                    : 0;

                // 计算前一周期的知识点数
                var previousKnowledgePoints = new HashSet<string>();
                foreach (var conversation in previousConversations)
                {
                    try
                    {
                        var points = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints ?? "[]");
                        foreach (var point in points)
                        {
                            previousKnowledgePoints.Add(point);
                        }
                    }
                    catch
                    {
                        // 解析失败，跳过
                    }
                }

                // 计算知识点趋势
                double knowledgeTrend = previousKnowledgePoints.Count > 0
                    ? Math.Round(((double)allKnowledgePoints.Count / previousKnowledgePoints.Count - 1) * 100, 1)
                    : 0;

                // 计算理解掌握百分比
                double totalConversations = understoodCount + learningCount + difficultCount;
                double masteryPercentage = totalConversations > 0
                    ? Math.Round((double)understoodCount / totalConversations * 100, 1)
                    : 0;

                // 构建返回数据
                var result = new
                {
                    totalQuestions = conversations.Count,
                    questionTrend = questionTrend,
                    totalKnowledgePoints = allKnowledgePoints.Count,
                    knowledgeTrend = knowledgeTrend,
                    masteryPercentage = masteryPercentage,
                    understoodCount = understoodCount,
                    learningCount = learningCount,
                    difficultCount = difficultCount,
                    masteryDistribution = new
                    {
                        understood = understoodCount,
                        learning = learningCount,
                        difficult = difficultCount
                    }
                };

                return Ok(new { code = 0, msg = "成功", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = $"服务器错误: {ex.Message}" });
            }
        }

        // 获取知识点详情的API
        [HttpGet]
        public async Task<IActionResult> GetKnowledgePointsDetails(string studentAccount, string period, string subject)
        {
            if (string.IsNullOrEmpty(studentAccount))
            {
                return BadRequest(new { code = 400, msg = "学生账号不能为空" });
            }

            try
            {
                // 计算时间范围
                DateTime startDate = GetStartDateByPeriod(period);

                // 准备查询
                var query = _context.StudentConversations.AsQueryable();

                // 根据学生筛选
                query = query.Where(c => c.StudentAccount == studentAccount);

                // 根据时间范围筛选
                if (period != "all")
                {
                    query = query.Where(c => c.CreatedTime >= startDate);
                }

                // 根据学科筛选
                if (subject != "all")
                {
                    if (subject == "chinese")
                    {
                        query = query.Where(c => c.Subject == "语文");
                    }
                    else if (subject == "math")
                    {
                        query = query.Where(c => c.Subject == "数学");
                    }
                    else if (subject == "english")
                    {
                        query = query.Where(c => c.Subject == "英语");
                    }
                    else
                    {
                        query = query.Where(c => c.Subject == subject);
                    }
                }

                // 执行查询
                var conversations = await query.ToListAsync();

                // 收集所有知识点及其理解状态
                var knowledgePointStats = new Dictionary<string, KnowledgePointStat>();

                // 创建一个集合存储已处理过的知识点和对应的会话
                var processedKnowledgePoints = new HashSet<string>();

                foreach (var conversation in conversations)
                {
                    try
                    {
                        var points = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints ?? "[]");
                        foreach (var point in points)
                        {
                            // 确保这是一个唯一的知识点字符串
                            string normalizedPoint = point.Trim();

                            if (!knowledgePointStats.ContainsKey(normalizedPoint))
                            {
                                knowledgePointStats[normalizedPoint] = new KnowledgePointStat { Name = normalizedPoint };
                            }

                            // 确保我们只为每个会话的每个知识点计数一次
                            string key = $"{conversation.Conversation_id}_{normalizedPoint}";
                            if (!processedKnowledgePoints.Contains(key))
                            {
                                processedKnowledgePoints.Add(key);

                                // 更新知识点的理解状态计数
                                switch (conversation.UnderstandingStatus)
                                {
                                    case "已透彻理解":
                                        knowledgePointStats[normalizedPoint].UnderstoodCount++;
                                        break;
                                    case "正在学习中":
                                        knowledgePointStats[normalizedPoint].LearningCount++;
                                        break;
                                    case "难以理解":
                                        knowledgePointStats[normalizedPoint].DifficultCount++;
                                        break;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // 解析失败，跳过
                    }
                }

                // 计算每个知识点的跟踪提问次数 (修改这部分来正确统计交流次数)
                foreach (var point in knowledgePointStats.Keys.ToList())
                {
                    var relatedConversationIds = new List<string>();

                    foreach (var conversation in conversations)
                    {
                        try
                        {
                            var points = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints ?? "[]");
                            if (points.Contains(point))
                            {
                                relatedConversationIds.Add(conversation.Conversation_id);
                            }
                        }
                        catch
                        {
                            // 解析失败，跳过
                        }
                    }

                    // 修改这里：获取这些会话中的全部人类消息数量(减去初始消息，因为初始消息算作会话创建，不算交流次数)
                    var allHumanMessages = await _context.ChatMessages
                        .Where(m => relatedConversationIds.Contains(m.ConversationId) && m.MessageType == "human")
                        .OrderBy(m => m.Timestamp)
                        .ToListAsync();

                    // 计算关于该知识点的有效交流次数 (总人类消息数 - 初始消息数)
                    int initialMessageCount = relatedConversationIds.Count; // 每个会话的第一条消息
                    int totalFollowUpCount = Math.Max(0, allHumanMessages.Count - initialMessageCount);

                    knowledgePointStats[point].FollowUpQuestions = totalFollowUpCount;
                }

                // 按理解程度排序并输出结果
                var result = knowledgePointStats.Values
                    .OrderByDescending(p => p.UnderstoodCount)
                    .ThenByDescending(p => p.LearningCount)
                    .ToList();

                return Ok(new { code = 0, msg = "成功", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = $"服务器错误: {ex.Message}" });
            }
        }
        // 获取学习活跃度趋势数据的API（更新版）
        [HttpGet]
        public async Task<IActionResult> GetActivityTrend(string studentAccount, string period, string subject)
        {
            if (string.IsNullOrEmpty(studentAccount))
            {
                return BadRequest(new { code = 400, msg = "学生账号不能为空" });
            }

            try
            {
                // 确定日期范围和分组间隔
                DateTime startDate;
                string groupFormat;
                int days;

                switch (period)
                {
                    case "week":
                        startDate = DateTime.Now.AddDays(-7);
                        groupFormat = "MM-dd";
                        days = 7;
                        break;
                    case "month":
                        startDate = DateTime.Now.AddMonths(-1);
                        groupFormat = "MM-dd";
                        days = 30;
                        break;
                    case "all":
                    default:
                        startDate = DateTime.Now.AddMonths(-6); // 默认查看近6个月
                        groupFormat = "yyyy-MM";
                        days = 180;
                        break;
                }

                // 生成日期序列
                var dateLabels = new List<string>();
                var allDates = new List<DateTime>();

                if (period == "all")
                {
                    // 如果是全部，按月生成标签
                    var currentDate = new DateTime(startDate.Year, startDate.Month, 1);
                    while (currentDate <= DateTime.Now)
                    {
                        dateLabels.Add(currentDate.ToString(groupFormat));
                        allDates.Add(currentDate);
                        currentDate = currentDate.AddMonths(1);
                    }
                }
                else
                {
                    // 按天生成标签
                    var currentDate = startDate.Date;
                    while (currentDate <= DateTime.Now.Date)
                    {
                        dateLabels.Add(currentDate.ToString(groupFormat));
                        allDates.Add(currentDate);
                        currentDate = currentDate.AddDays(1);
                    }
                }

                // 获取会话数据
                var query = _context.StudentConversations
                    .Where(c => c.StudentAccount == studentAccount);

                if (period != "all")
                {
                    query = query.Where(c => c.CreatedTime >= startDate);
                }

                // 根据学科筛选
                if (subject != "all")
                {
                    if (subject == "chinese")
                    {
                        query = query.Where(c => c.Subject == "语文");
                    }
                    else if (subject == "math")
                    {
                        query = query.Where(c => c.Subject == "数学");
                    }
                    else if (subject == "english")
                    {
                        query = query.Where(c => c.Subject == "英语");
                    }
                    else
                    {
                        query = query.Where(c => c.Subject == subject);
                    }
                }

                var conversations = await query.ToListAsync();

                // 按日期分组
                var questionsByDate = conversations
                    .GroupBy(c => period == "all" ? new DateTime(c.CreatedTime.Year, c.CreatedTime.Month, 1) : c.CreatedTime.Date)
                    .ToDictionary(g => g.Key, g => g.Count());

                // 知识点数据
                var knowledgePointsByDate = new Dictionary<DateTime, int>();

                foreach (var conversation in conversations)
                {
                    var dateKey = period == "all" ? new DateTime(conversation.CreatedTime.Year, conversation.CreatedTime.Month, 1) : conversation.CreatedTime.Date;

                    try
                    {
                        var points = JsonConvert.DeserializeObject<List<string>>(conversation.KnowledgePoints ?? "[]");
                        if (!knowledgePointsByDate.ContainsKey(dateKey))
                        {
                            knowledgePointsByDate[dateKey] = 0;
                        }

                        knowledgePointsByDate[dateKey] += points.Count;
                    }
                    catch
                    {
                        // 解析失败，跳过
                    }
                }

                // 新增：获取每个日期的交流次数数据
                var interactionsByDate = new Dictionary<DateTime, int>();

                // 收集所有会话ID
                var conversationIds = conversations.Select(c => c.Conversation_id).ToList();

                // 获取这些会话的所有人类消息
                var allMessages = await _context.ChatMessages
                    .Where(m => conversationIds.Contains(m.ConversationId) && m.MessageType == "human")
                    .ToListAsync();

                // 按会话ID分组消息
                var messagesByConversation = allMessages.GroupBy(m => m.ConversationId).ToDictionary(g => g.Key, g => g.ToList());

                // 计算每个日期的交流次数（总消息数减去初始消息数）
                foreach (var conversation in conversations)
                {
                    var dateKey = period == "all" ? new DateTime(conversation.CreatedTime.Year, conversation.CreatedTime.Month, 1) : conversation.CreatedTime.Date;

                    if (!interactionsByDate.ContainsKey(dateKey))
                    {
                        interactionsByDate[dateKey] = 0;
                    }

                    // 如果存在该会话的消息记录
                    if (messagesByConversation.ContainsKey(conversation.Conversation_id))
                    {
                        // 该会话的消息数减1（排除初始消息）
                        int interactionCount = Math.Max(0, messagesByConversation[conversation.Conversation_id].Count - 1);
                        interactionsByDate[dateKey] += interactionCount;
                    }
                }

                // 填充数据数组
                var questionsData = new List<int>();
                var knowledgePointsData = new List<int>();
                var interactionsData = new List<int>(); // 新增：交流次数数据

                foreach (var date in allDates)
                {
                    questionsData.Add(questionsByDate.ContainsKey(date) ? questionsByDate[date] : 0);
                    knowledgePointsData.Add(knowledgePointsByDate.ContainsKey(date) ? knowledgePointsByDate[date] : 0);
                    interactionsData.Add(interactionsByDate.ContainsKey(date) ? interactionsByDate[date] : 0); // 新增
                }

                var result = new
                {
                    dates = dateLabels,
                    questions = questionsData,
                    knowledgePoints = knowledgePointsData,
                    interactions = interactionsData // 新增
                };

                return Ok(new { code = 0, msg = "成功", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { code = 500, msg = $"服务器错误: {ex.Message}" });
            }
        }

        // 辅助方法：根据周期获取开始日期
        private DateTime GetStartDateByPeriod(string period)
        {
            switch (period)
            {
                case "week":
                    return DateTime.Now.AddDays(-7);
                case "month":
                    return DateTime.Now.AddMonths(-1);
                case "all":
                default:
                    // 使用一个更安全的默认值，如1年前，而不是DateTime.MinValue
                    return DateTime.Now.AddYears(-1); // 查询所有历史记录
            }
        }

        // 辅助方法：获取前一个周期的开始日期
        private DateTime GetPreviousStartDate(string period, DateTime currentStartDate)
        {
            switch (period)
            {
                case "week":
                    return currentStartDate.AddDays(-7);
                case "month":
                    return currentStartDate.AddMonths(-1);
                case "all":
                default:
                    // 对于"all"选项，使用2年前而不是DateTime.MinValue
                    return DateTime.Now.AddYears(-2);
            }
        }
    
    // GET: Parents/Details/5
    public async Task<IActionResult> Details(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var parent = await _context.Parents
                .FirstOrDefaultAsync(m => m.Account == id);
            if (parent == null)
            {
                return NotFound();
            }

            return View(parent);
        }

        // GET: Parents/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Parents/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Account,Name,PhoneNumber,Password")] Parent parent)
        {
            if (ModelState.IsValid)
            {
                _context.Add(parent);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(parent);
        }

        // GET: Parents/Edit/5
        public async Task<IActionResult> Edit(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var parent = await _context.Parents.FindAsync(id);
            if (parent == null)
            {
                return NotFound();
            }
            return View(parent);
        }

        // POST: Parents/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, [Bind("Account,Name,PhoneNumber,Password")] Parent parent)
        {
            if (id != parent.Account)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(parent);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!ParentExists(parent.Account))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            return View(parent);
        }

        // GET: Parents/Delete/5
        public async Task<IActionResult> Delete(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var parent = await _context.Parents
                .FirstOrDefaultAsync(m => m.Account == id);
            if (parent == null)
            {
                return NotFound();
            }

            return View(parent);
        }

        // POST: Parents/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            var parent = await _context.Parents.FindAsync(id);
            if (parent != null)
            {
                _context.Parents.Remove(parent);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool ParentExists(string id)
        {
            return _context.Parents.Any(e => e.Account == id);
        }
    }
    // 知识点统计辅助类
    public class KnowledgePointStat
    {
        public string Name { get; set; }
        public int UnderstoodCount { get; set; } = 0;
        public int LearningCount { get; set; } = 0;
        public int DifficultCount { get; set; } = 0;
        public int FollowUpQuestions { get; set; } = 0;
    }
}
