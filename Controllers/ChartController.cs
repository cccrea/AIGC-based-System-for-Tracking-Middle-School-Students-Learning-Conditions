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
    public class ChartController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public ChartController(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public class ChartRequest
        {
            public string ChartType { get; set; }
            public List<StudentInput> Input { get; set; }
        }

        public class StudentInput
        {
            public string Account { get; set; }
            public string Name { get; set; }
            public int Grade { get; set; }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateChart([FromBody] ChartRequest request)
        {
            // 直接检查 chart_type 和 input 字段
            if (request == null || string.IsNullOrEmpty(request.ChartType) || request.Input == null)
            {
                return BadRequest(new { message = "请求参数无效，chart_type 或 input 缺失" });
            }

            var apiUrl = "https://api.coze.com/v1/workflow/run"; // Coze API URL
            var token = "pat_Ia4zXKl1qy5dnouLqecmLvkQTzNf4VbBtAp9Hc1o5Kb5t0q2gtvoGQHHx3irpzMj"; // Token
            var workflowId = "7461471856773808136"; // Coze API 工作流 ID

            // 创建请求体
            var payload = new
            {
                workflow_id = workflowId,
                parameters = new
                {
                    chart_type = request.ChartType,
                    input = request.Input
                }
            };

            try
            {
                var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
                var requestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                {
                    Content = content
                };
                requestMessage.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(requestMessage);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    var responseData = JsonConvert.DeserializeObject<CozeApiResponse>(result);

                    if (!string.IsNullOrEmpty(responseData?.Data))
                    {
                        var responseDataParsed = JsonConvert.DeserializeObject<CozeApiData>(responseData.Data);
                        var downloadLink = responseDataParsed?.Output;
                        return Ok(new { output = downloadLink });
                    }
                    else
                    {
                        return StatusCode(500, new { message = "没有返回有效的下载链接" });
                    }
                }
                else
                {
                    var errorResponse = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, new { message = errorResponse });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }


    }
}
