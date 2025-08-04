using Microsoft.AspNetCore.Mvc;
using test4.Models;
using test4.Services;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace test4.Controllers
{
    public class FileController : Controller
    {
        private readonly AcademicDbContext _context;  // 用来与数据库交互
        private readonly CosService _cosService;     // 用来与 COS 交互

        // 构造函数注入 DbContext 和 CosService
        public FileController(AcademicDbContext context, CosService cosService)
        {
            _context = context;
            _cosService = cosService;
        }

        // GET: File
        public IActionResult Index()
        {
            var files = _context.LessonPlans.ToList();  // 获取所有教案记录
            return View(files);
        }

        // GET: FileController/Create
        public IActionResult Create()
        {
            return View();
        }




        // POST: FileController/Create
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] string lessonName, [FromForm] IFormFile file, [FromForm] string teacherAccount)
        {
            // 检查文件是否存在
            if (file == null || file.Length == 0)
            {
                ModelState.AddModelError("", "请上传有效的文件。");
                return View();
            }

            // 如果前端传入的教师账户为空，返回错误提示
            if (string.IsNullOrEmpty(teacherAccount))
            {
                ModelState.AddModelError("", "教师账号不能为空。");
                return View();
            }

            // 保存文件到本地临时路径
            var tempDirectory = @"D:\C#\test4\test4\src\Temporary-lessonplan\";
            var filePath = Path.Combine(tempDirectory, file.FileName);
            var fileExtension = Path.GetExtension(filePath).ToLower();

            // 保存文件到临时路径
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 使用教师账号和教案名称生成唯一的文件名
            string fileKey = $"{teacherAccount}-{lessonName}{fileExtension}"; // 格式：教师ID-教案名

            // 上传文件到 COS，并获取文件的 URL
            await _cosService.UploadFileAsync("academic-tracking-1342405047", fileKey, filePath);
            string fileUrl = _cosService.GetObjectUrl("academic-tracking-1342405047", fileKey);

            // 将文件 URL、教案名称和教师账号保存到数据库
            var lessonPlan = new LessonPlan
            {
                TeacherAccount = teacherAccount,
                LessonName = lessonName,
                FileUrl = fileUrl,
                UploadDate = DateTime.Now // 设置上传日期
            };
            _context.Add(lessonPlan);
            await _context.SaveChangesAsync();

            // 返回成功提示或重定向
            return RedirectToAction("Teacher", "Home");
        }




        // GET: FileController/Edit/5
        public async Task<IActionResult> Edit(int id)
        {
            var lessonPlan = await _context.LessonPlans.FindAsync(id);
            if (lessonPlan == null)
            {
                return NotFound();
            }
            return View(lessonPlan);
        }

        // POST: FileController/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, LessonPlan model)
        {
            if (id != model.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(model);  // 更新教案记录
                    await _context.SaveChangesAsync();
                }
                catch (Exception)
                {
                    if (!_context.LessonPlans.Any(e => e.Id == model.Id))
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
            return View(model);
        }

        // GET: FileController/Delete/5
        public async Task<IActionResult> Delete(int id)
        {
            var lessonPlan = await _context.LessonPlans
                .FirstOrDefaultAsync(m => m.Id == id);
            if (lessonPlan == null)
            {
                return NotFound();
            }

            return View(lessonPlan);
        }

        // POST: FileController/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var lessonPlan = await _context.LessonPlans.FindAsync(id);
            _context.LessonPlans.Remove(lessonPlan);  // 删除文件记录
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
    }
}
