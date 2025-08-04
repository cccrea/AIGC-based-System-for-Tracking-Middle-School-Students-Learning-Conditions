using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace test4.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LessonPlanController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<LessonPlanController> _logger;

        public LessonPlanController(HttpClient httpClient, ILogger<LessonPlanController> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateLessonPlan([FromBody] LessonPlanRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Input))
            {
                return BadRequest(new { message = "请求数据无效，input 字段为空" });
            }

            string inputString = request.Input;

            var apiUrl = "https://api.coze.com/v1/workflow/run";  // Coze API URL
            var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj";  // 替换为实际的 token
            var workflowId = "7461242926053588997";  // 替换为实际的 workflow_id

            var payload = new
            {
                workflow_id = workflowId,
                parameters = new
                {
                    input = inputString
                }
            };

            try
            {
                // 创建 HTTP 请求
                var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");

                // 创建 HttpRequestMessage 并将 Authorization 头添加到请求中
                var requestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                {
                    Content = content
                };
                requestMessage.Headers.Add("Authorization", $"Bearer {token}");

                // 发送请求到 Coze API
                var response = await _httpClient.SendAsync(requestMessage);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();

                    // 反序列化 Coze API 返回的 JSON，data 是一个包含 output 字符串的字段
                    var responseData = JsonConvert.DeserializeObject<CozeApiResponse>(result);

                    if (responseData?.Data != null)
                    {
                        // 解析返回的 JSON 字符串，并提取 output 链接
                        var responseDataParsed = JsonConvert.DeserializeObject<CozeApiData>(responseData.Data);
                        var downloadLink = responseDataParsed?.Output;

                        return Ok(new { output = downloadLink });
                    }
                    else
                    {
                        _logger.LogError("返回的数据没有有效的 output 链接");
                        return StatusCode(500, new { message = "没有返回有效的下载链接" });
                    }
                }
                else
                {
                    var errorResponse = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"请求失败，错误信息: {errorResponse}");
                    return StatusCode((int)response.StatusCode, new { message = $"请求 Coze API 失败: {errorResponse}" });
                }

            }
            catch (Exception ex)
            {
                _logger.LogError($"服务器处理请求时出错: {ex.Message}");
                return StatusCode(500, new { message = $"服务器内部错误: {ex.Message}" });
            }
        }
    }

    // 用于请求的数据结构
    public class LessonPlanRequest
    {
        public string Input { get; set; }
    }

    // Coze API 返回的结构
    public class CozeApiResponse
    {
        public int Code { get; set; }
        public string Msg { get; set; }
        // 修改这里，data 应该是一个对象，包含 JSON 字符串
        public string Data { get; set; }
    }

    public class CozeApiData
    {
        // `Data` 是一个 JSON 字符串，包含 output 链接
        public string Output { get; set; }
    }

}
