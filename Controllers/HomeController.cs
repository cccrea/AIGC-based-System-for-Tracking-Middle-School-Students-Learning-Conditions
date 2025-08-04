using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using test4.Models;

namespace test4.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AcademicDbContext _context; // ��������һ�����ݿ���������

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

       
        // ��ʦҳ��
        public IActionResult Teacher()
        {
            return RedirectToAction("teacher", "Teachers");
        }
        
        [HttpGet]
        public IActionResult Login()
        {
            // ���ص�¼ҳ��
            return View();
        }

        [HttpPost]
        public IActionResult Login(string phone, string password)
        {
            // �����ݿ��в����û�
            var user = _context.Users.FirstOrDefault(u => u.PhoneNumber == phone && u.Password == password);

            // ѧ��
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Student")
            {              
                // �� HomeController ���ض��� StudentsController �� Student ����
                return RedirectToAction("Student", "Students", new { account = user.Account, name = user.Name });

            }
            // ��ʦ
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Teacher")
            {
                // �ض��򵽽�ʦ
                return RedirectToAction("Teacher","Teachers", new { account = user.Account, name = user.Name });
               // return RedirectToAction("index", "Teachers");
            }
            // �ҳ�
            if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Parent")
            {
                // �ض��򵽼ҳ�
                return RedirectToAction("Dashboard", "Parents", new { parentAccount = user.Account });
            }
            // ����Ա
            else if (user != null && _context.Entry(user).Metadata.GetDiscriminatorValue() as string == "Admin")
            {
                // �ض��򵽹���Ա���Ǳ���ҳ��
                return RedirectToAction("Dashboard", "Admin");
            }

            // ��¼ʧ�ܣ����ش�����Ϣ
            ViewData["ErrorMessage"] = "�ֻ��Ż�������������ԣ�";
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
