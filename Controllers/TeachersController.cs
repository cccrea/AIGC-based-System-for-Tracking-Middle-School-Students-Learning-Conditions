using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using test4.Models;
using test4.Services;
using System.Net.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace test4.Controllers
{

    
    public class TeachersController : Controller
    {
        private readonly AcademicDbContext _context;
        private readonly CosService _cosService;
        public TeachersController(AcademicDbContext context,CosService cosService)
        {
            _context = context;
            _cosService = cosService;
        }
        // 处理具体的 teacher 视图
        public async Task<IActionResult> Teacher(string account, string name)
        {
            // 调试输出
            await Task.Run(() =>
            {
                Console.WriteLine($"Account: {account}, Name: {name}");
            });

            // 设置ViewBag变量
            ViewBag.TeacherName = name;
            ViewBag.TeacherAccount = account;

            return View("teacher", new UserInfo { Account = account, Name = name });
        }



        // GET: Teachers
        public async Task<IActionResult> Index()
        {
            return View(await _context.Teachers.ToListAsync());
        }
        // 获取当前登录教师的教案文件列表

        [HttpGet]
        public async Task<IActionResult> GetLessonPlans(string account)
        {
            if (string.IsNullOrEmpty(account))
            {
                return BadRequest(new { error = "教师账号不能为空" });
            }

            try
            {
                // 查找当前教师的教案数据
                var lessonPlans = await _context.LessonPlans
                    .Where(lp => lp.TeacherAccount == account)
                    .Select(lp => new {
                        id = lp.Id,
                        lessonName = lp.LessonName,
                        fileUrl = lp.FileUrl,
                        uploadDate = lp.UploadDate // 添加上传日期字段
                    })
                    .ToListAsync();

                // 返回数据
                return Json(lessonPlans);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 成绩分析页面
        public IActionResult GradeAnalysis(string account)
        {
            // 设置ViewBag变量
            if (!string.IsNullOrEmpty(account))
            {
                var teacher = _context.Teachers.FirstOrDefault(t => t.Account == account);
                if (teacher != null)
                {
                    ViewBag.TeacherName = teacher.Name;
                    ViewBag.TeacherAccount = account;
                }
            }

            ViewBag.ActiveMenu = "GradeAnalysis";
            return View();
        }


        // 教案辅助页面
        public IActionResult LessonPlanHelper(string account)
        {
            // 设置ViewBag变量
            if (!string.IsNullOrEmpty(account))
            {
                var teacher = _context.Teachers.FirstOrDefault(t => t.Account == account);
                if (teacher != null)
                {
                    ViewBag.TeacherName = teacher.Name;
                    ViewBag.TeacherAccount = account;
                }
            }

            ViewBag.ActiveMenu = "LessonPlanHelper";
            return View();
        }

        // 教案管理页面
        public IActionResult LessonPlanManagement(string account)
        {
            // 设置ViewBag变量
            if (!string.IsNullOrEmpty(account))
            {
                var teacher = _context.Teachers.FirstOrDefault(t => t.Account == account);
                if (teacher != null)
                {
                    ViewBag.TeacherName = teacher.Name;
                    ViewBag.TeacherAccount = account;
                }
            }

            ViewBag.ActiveMenu = "LessonPlanManagement";
            return View();
        }
        // GET: Teachers/Details/5
        public async Task<IActionResult> Details(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var teacher = await _context.Teachers
                .FirstOrDefaultAsync(m => m.Account == id);
            if (teacher == null)
            {
                return NotFound();
            }

            return View(teacher);
        }

        // GET: Teachers/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Teachers/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Subject,Account,Name,PhoneNumber,Password")] Teacher teacher)
        {
            if (ModelState.IsValid)
            {
                _context.Add(teacher);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(teacher);
        }

        // GET: Teachers/Edit/5
        public async Task<IActionResult> Edit(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher == null)
            {
                return NotFound();
            }
            return View(teacher);
        }

        // POST: Teachers/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, [Bind("Subject,Account,Name,PhoneNumber,Password")] Teacher teacher)
        {
            if (id != teacher.Account)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(teacher);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!TeacherExists(teacher.Account))
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
            return View(teacher);
        }

        // GET: Teachers/Delete/5
        public async Task<IActionResult> Delete(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var teacher = await _context.Teachers
                .FirstOrDefaultAsync(m => m.Account == id);
            if (teacher == null)
            {
                return NotFound();
            }

            return View(teacher);
        }

        // POST: Teachers/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher != null)
            {
                _context.Teachers.Remove(teacher);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        [HttpGet("/teachers/abc/{id}")]
        public IActionResult abc(int id)
        {
            Console.WriteLine(id);
            return Json(new { a = 1 });
        }
        // 删除教案
        [HttpGet("/Teachers/DeleteLessonPlan/{id}")]
        
        public async Task<IActionResult> DeleteLessonPlan(int id)
        {
            // 查找教案
            var lessonPlan = await _context.LessonPlans.FindAsync(id);
            if (lessonPlan == null)
            {
                return NotFound();
            }

            // 删除教案
            _context.LessonPlans.Remove(lessonPlan);
            await _context.SaveChangesAsync();

            return Json(new { success = true }); // 返回删除成功的响应
        }
        // 上传成绩文件
        [HttpPost]
        public async Task<IActionResult> UploadGradeFile([FromForm] string fileName, [FromForm] IFormFile file, [FromForm] string teacherAccount)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "请上传有效的文件" });
            }

            if (string.IsNullOrEmpty(teacherAccount))
            {
                return BadRequest(new { error = "教师账号不能为空" });
            }

            try
            {
                // 保存文件到临时目录
                var tempDirectory = @"D:\C#\test4\test4\src\Temporary-grades\";
                if (!Directory.Exists(tempDirectory))
                {
                    Directory.CreateDirectory(tempDirectory);
                }

                var filePath = Path.Combine(tempDirectory, file.FileName);
                var fileExtension = Path.GetExtension(filePath).ToLower();

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // 生成唯一的文件名
                string fileKey = $"grades-{teacherAccount}-{DateTime.Now.ToString("yyyyMMddHHmmss")}{fileExtension}";

                // 上传到腾讯云
                await _cosService.UploadFileAsync("academic-tracking-1342405047", fileKey, filePath);
                string fileUrl = _cosService.GetObjectUrl("academic-tracking-1342405047", fileKey);

                // 保存记录到数据库
                var gradeFile = new GradeFile
                {
                    TeacherAccount = teacherAccount,
                    FileName = fileName,
                    FileUrl = fileUrl,
                    UploadDate = DateTime.Now
                };

                _context.GradeFiles.Add(gradeFile);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, fileUrl = fileUrl, id = gradeFile.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 获取教师的成绩文件列表
        [HttpGet]
        public async Task<IActionResult> GetGradeFiles(string account)
        {
            if (string.IsNullOrEmpty(account))
            {
                return BadRequest(new { error = "教师账号不能为空" });
            }

            try
            {
                var gradeFiles = await _context.GradeFiles
                    .Where(gf => gf.TeacherAccount == account)
                    .Select(gf => new {
                        id = gf.Id,
                        fileName = gf.FileName,
                        fileUrl = gf.FileUrl,
                        uploadDate = gf.UploadDate
                    })
                    .OrderByDescending(gf => gf.uploadDate)
                    .ToListAsync();

                return Ok(gradeFiles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 删除成绩文件
        [HttpDelete]
        public async Task<IActionResult> DeleteGradeFile(int id)
        {
            try
            {
                var gradeFile = await _context.GradeFiles.FindAsync(id);
                if (gradeFile == null)
                {
                    return NotFound(new { error = "文件不存在" });
                }

                _context.GradeFiles.Remove(gradeFile);
                await _context.SaveChangesAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
        [HttpGet("/Teachers/AnalyzeGradeFile")]
        public async Task<IActionResult> AnalyzeGradeFile([FromQuery] int fileId)
        {
            if (fileId <= 0)
            {
                return BadRequest(new { error = "文件ID无效" });
            }

            try
            {
                // 从数据库获取文件信息
                var gradeFile = await _context.GradeFiles.FindAsync(fileId);
                if (gradeFile == null)
                {
                    return NotFound(new { error = "文件不存在" });
                }

                // 下载文件内容
                byte[] fileContent;
                using (var httpClient = new HttpClient())
                {
                    fileContent = await httpClient.GetByteArrayAsync(gradeFile.FileUrl);
                }

                // 返回文件内容和元数据
                return Ok(new
                {
                    fileContent = Convert.ToBase64String(fileContent),
                    fileName = gradeFile.FileName,
                    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    id = gradeFile.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private bool TeacherExists(string id)
        {
            return _context.Teachers.Any(e => e.Account == id);
        }
    }
}
