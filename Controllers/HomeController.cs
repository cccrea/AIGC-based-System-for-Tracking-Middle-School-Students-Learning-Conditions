using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using test4.Models;

namespace test4.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AcademicDbContext _context; // 假设你有一个数据库上下文类

        public HomeController(ILogger<HomeController> logger, AcademicDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        public IActionResult RoleSelection()
        {
            return View();
        }

       
        // 教师页面
        public IActionResult Teacher()
        {
            return RedirectToAction("teacher", "Teachers");
        }
        
        [HttpGet]
        public IActionResult Login()
        {
            // 返回登录页面
            return View();
        }

        [HttpPost]
        public IActionResult Login(string phone, string password)
        {
            // 从数据库中查找用户
            var user = _context.Users.FirstOrDefault(u => u.PhoneNumber == phone && u.Password == password);

            // 学生
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Student")
            {              
                // 在 HomeController 中重定向到 StudentsController 的 Student 方法
                return RedirectToAction("Student", "Students", new { account = user.Account, name = user.Name });

            }
            // 教师
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Teacher")
            {
                // 重定向到教师
                return RedirectToAction("Teacher","Teachers", new { account = user.Account, name = user.Name });
               // return RedirectToAction("index", "Teachers");
            }
            // 家长
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Parent")
            {
                // 重定向到家长
                return RedirectToAction("Dashboard", "Parents", new { parentAccount = user.Account });
            }
            // 管理员
            else if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Admin")
            {
                // 重定向到管理员的仪表盘页面
                return RedirectToAction("Dashboard", "Admin");
            }

            // 登录失败，返回错误信息
            ViewData["ErrorMessage"] = "手机号或密码错误，请重试！";
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
