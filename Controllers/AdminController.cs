using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using test4.Models;

namespace test4.Controllers
{
    public class AdminController : Controller
    {
        private readonly AcademicDbContext _context;

        public AdminController(AcademicDbContext context)
        {
            _context = context;
        }

        // 仪表盘 - 管理员首页
        public IActionResult Dashboard()
        {
            // 获取仪表盘统计数据
            ViewBag.StudentCount = _context.Students.Count();
            ViewBag.TeacherCount = _context.Teachers.Count();
            ViewBag.ParentCount = _context.Parents.Count();
            ViewBag.SchoolCount = _context.Schools.Count();
            ViewBag.ClassCount = _context.Classes.Count();

            return View();
        }

        #region 用户管理

        // 学生管理
        public async Task<IActionResult> ManageStudents()
        {
            var students = await _context.Students
                .Include(s => s.School)
                .Include(s => s.Class)
                .ToListAsync();

            return View(students);
        }

        // 教师管理
        public async Task<IActionResult> ManageTeachers()
        {
            var teachers = await _context.Teachers
                .Include(t => t.School)
                .ToListAsync();

            return View(teachers);
        }

        // 家长管理
        public async Task<IActionResult> ManageParents()
        {
            var parents = await _context.Parents.ToListAsync();
            return View(parents);
        }

        // 创建学生视图
        public IActionResult CreateStudent()
        {
            // 填充学校和班级下拉列表
            ViewBag.Schools = _context.Schools.ToList();
            ViewBag.Classes = _context.Classes.ToList();
            ViewBag.Parents = _context.Parents.ToList();
            ViewBag.Teachers = _context.Teachers.ToList();

            return View();
        }

        // 创建学生处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateStudent(Student student)
        {
            if (ModelState.IsValid)
            {
                // 检查账号是否已存在
                if (await _context.Users.AnyAsync(u => u.Account == student.Account))
                {
                    ModelState.AddModelError("Account", "该账号已存在。");
                    ViewBag.Schools = _context.Schools.ToList();
                    ViewBag.Classes = _context.Classes.ToList();
                    ViewBag.Parents = _context.Parents.ToList();
                    ViewBag.Teachers = _context.Teachers.ToList();
                    return View(student);
                }

                _context.Add(student);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(ManageStudents));
            }

            ViewBag.Schools = _context.Schools.ToList();
            ViewBag.Classes = _context.Classes.ToList();
            ViewBag.Parents = _context.Parents.ToList();
            ViewBag.Teachers = _context.Teachers.ToList();
            return View(student);
        }

        // 编辑学生视图
        public async Task<IActionResult> EditStudent(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var student = await _context.Students.FindAsync(id);
            if (student == null)
            {
                return NotFound();
            }

            ViewBag.Schools = _context.Schools.ToList();
            ViewBag.Classes = _context.Classes.ToList();
            ViewBag.Parents = _context.Parents.ToList();
            ViewBag.Teachers = _context.Teachers.ToList();

            return View(student);
        }

        // 编辑学生处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditStudent(string id, Student student)
        {
            if (id != student.Account)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(student);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!await _context.Students.AnyAsync(s => s.Account == student.Account))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(ManageStudents));
            }

            ViewBag.Schools = _context.Schools.ToList();
            ViewBag.Classes = _context.Classes.ToList();
            ViewBag.Parents = _context.Parents.ToList();
            ViewBag.Teachers = _context.Teachers.ToList();
            return View(student);
        }

        // 删除学生视图
        public async Task<IActionResult> DeleteStudent(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var student = await _context.Students
                .FirstOrDefaultAsync(m => m.Account == id);

            if (student == null)
            {
                return NotFound();
            }

            return View(student);
        }

        // 删除学生处理
        [HttpPost, ActionName("DeleteStudent")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteStudentConfirmed(string id)
        {
            // 查找学生所有的会话
            var studentConversations = await _context.StudentConversations
                .Where(sc => sc.StudentAccount == id)
                .ToListAsync();

            // 查找学生所有的聊天消息
            var chatMessages = await _context.ChatMessages
                .Where(cm => studentConversations.Select(sc => sc.Conversation_id).Contains(cm.ConversationId))
                .ToListAsync();

            // 首先删除所有聊天消息
            _context.ChatMessages.RemoveRange(chatMessages);

            // 然后删除所有会话
            _context.StudentConversations.RemoveRange(studentConversations);

            // 最后删除学生
            var student = await _context.Students.FindAsync(id);
            if (student != null)
            {
                _context.Students.Remove(student);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(ManageStudents));
        }

        // 创建教师视图
        public IActionResult CreateTeacher()
        {
            ViewBag.Schools = _context.Schools.ToList();
            return View();
        }

        // 创建教师处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateTeacher(Teacher teacher)
        {
            if (ModelState.IsValid)
            {
                // 检查账号是否已存在
                if (await _context.Users.AnyAsync(u => u.Account == teacher.Account))
                {
                    ModelState.AddModelError("Account", "该账号已存在。");
                    ViewBag.Schools = _context.Schools.ToList();
                    return View(teacher);
                }

                _context.Add(teacher);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(ManageTeachers));
            }

            ViewBag.Schools = _context.Schools.ToList();
            return View(teacher);
        }

        // 编辑教师视图
        public async Task<IActionResult> EditTeacher(string id)
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

            ViewBag.Schools = _context.Schools.ToList();
            return View(teacher);
        }

        // 编辑教师处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditTeacher(string id, Teacher teacher)
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
                    if (!await _context.Teachers.AnyAsync(t => t.Account == teacher.Account))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(ManageTeachers));
            }

            ViewBag.Schools = _context.Schools.ToList();
            return View(teacher);
        }

        // 删除教师视图
        public async Task<IActionResult> DeleteTeacher(string id)
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

        // 删除教师处理
        [HttpPost, ActionName("DeleteTeacher")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteTeacherConfirmed(string id)
        {
            // 查找所有关联的学生
            var studentsWithTeacher = await _context.Students
                .Where(s => s.ChineseTeacherAccount == id ||
                           s.MathTeacherAccount == id ||
                           s.EnglishTeacherAccount == id)
                .ToListAsync();

            // 清除学生对该教师的引用
            foreach (var student in studentsWithTeacher)
            {
                if (student.ChineseTeacherAccount == id)
                    student.ChineseTeacherAccount = null;

                if (student.MathTeacherAccount == id)
                    student.MathTeacherAccount = null;

                if (student.EnglishTeacherAccount == id)
                    student.EnglishTeacherAccount = null;
            }

            // 查找所有教案
            var lessonPlans = await _context.LessonPlans
                .Where(lp => lp.TeacherAccount == id)
                .ToListAsync();

            // 删除所有教案
            _context.LessonPlans.RemoveRange(lessonPlans);

            // 查找所有成绩文件
            var gradeFiles = await _context.GradeFiles
                .Where(gf => gf.TeacherAccount == id)
                .ToListAsync();

            // 删除所有成绩文件
            _context.GradeFiles.RemoveRange(gradeFiles);

            // 最后删除教师
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher != null)
            {
                _context.Teachers.Remove(teacher);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(ManageTeachers));
        }

        // 创建家长视图
        public IActionResult CreateParent()
        {
            return View();
        }

        // 创建家长处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateParent(Parent parent)
        {
            if (ModelState.IsValid)
            {
                // 检查账号是否已存在
                if (await _context.Users.AnyAsync(u => u.Account == parent.Account))
                {
                    ModelState.AddModelError("Account", "该账号已存在。");
                    return View(parent);
                }

                _context.Add(parent);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(ManageParents));
            }

            return View(parent);
        }

        // 编辑家长视图
        public async Task<IActionResult> EditParent(string id)
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

        // 编辑家长处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditParent(string id, Parent parent)
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
                    if (!await _context.Parents.AnyAsync(p => p.Account == parent.Account))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(ManageParents));
            }

            return View(parent);
        }

        // 删除家长视图
        public async Task<IActionResult> DeleteParent(string id)
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

        // 删除家长处理
        [HttpPost, ActionName("DeleteParent")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteParentConfirmed(string id)
        {
            // 查找所有关联的学生
            var studentsWithParent = await _context.Students
                .Where(s => s.ParentAccount == id)
                .ToListAsync();

            // 清除学生对该家长的引用
            foreach (var student in studentsWithParent)
            {
                student.ParentAccount = null;
            }

            // 最后删除家长
            var parent = await _context.Parents.FindAsync(id);
            if (parent != null)
            {
                _context.Parents.Remove(parent);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(ManageParents));
        }

        #endregion

        #region 学校管理

        // 学校管理
        public async Task<IActionResult> ManageSchools()
        {
            var schools = await _context.Schools.ToListAsync();
            return View(schools);
        }

        // 创建学校视图
        public IActionResult CreateSchool()
        {
            return View();
        }

        //创建学校处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateSchool(School school)
        {
            if (ModelState.IsValid)
            {
                _context.Add(school);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(ManageSchools));
            }

            return View(school);
        }

        // 编辑学校视图
        public async Task<IActionResult> EditSchool(int id)
        {
            var school = await _context.Schools.FindAsync(id);
            if (school == null)
            {
                return NotFound();
            }

            return View(school);
        }

        // 编辑学校处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditSchool(int id, School school)
        {
            if (id != school.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(school);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!await _context.Schools.AnyAsync(s => s.Id == school.Id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(ManageSchools));
            }

            return View(school);
        }

        // 删除学校视图
        public async Task<IActionResult> DeleteSchool(int id)
        {
            var school = await _context.Schools
                .FirstOrDefaultAsync(m => m.Id == id);

            if (school == null)
            {
                return NotFound();
            }

            return View(school);
        }

        // 删除学校处理
        [HttpPost, ActionName("DeleteSchool")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteSchoolConfirmed(int id)
        {
            // 检查是否有关联的学生或教师
            bool hasStudents = await _context.Students.AnyAsync(s => s.SchoolId == id);
            bool hasTeachers = await _context.Teachers.AnyAsync(t => t.SchoolId == id);
            bool hasClasses = await _context.Classes.AnyAsync(c => c.SchoolId == id);

            if (hasStudents || hasTeachers)
            {
                TempData["ErrorMessage"] = "该学校下有关联的学生或教师，无法删除。";
                return RedirectToAction(nameof(ManageSchools));
            }

            if (hasClasses)
            {
                TempData["ErrorMessage"] = "该学校下有关联的班级，无法删除。";
                return RedirectToAction(nameof(ManageSchools));
            }

            var school = await _context.Schools.FindAsync(id);
            if (school != null)
            {
                _context.Schools.Remove(school);
                await _context.SaveChangesAsync();
            }

            return RedirectToAction(nameof(ManageSchools));
        }

        #endregion

        #region 班级管理

        // 班级管理
        public async Task<IActionResult> ManageClasses()
        {
            var classes = await _context.Classes
                .Include(c => c.School)
                .ToListAsync();

            return View(classes);
        }

        // 创建班级视图
        public IActionResult CreateClass()
        {
            ViewBag.Schools = _context.Schools.ToList();
            return View();
        }

        // 创建班级处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateClass(Class classEntity)
        {
            // 添加调试输出
            System.Diagnostics.Debug.WriteLine("CreateClass POST方法被调用");
            System.Diagnostics.Debug.WriteLine($"模型状态是否有效: {ModelState.IsValid}");

            if (!ModelState.IsValid)
            {
                // 记录验证错误
                foreach (var modelState in ModelState.Values)
                {
                    foreach (var error in modelState.Errors)
                    {
                        System.Diagnostics.Debug.WriteLine($"验证错误: {error.ErrorMessage}");
                    }
                }
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(classEntity);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(ManageClasses));
                }
                catch (Exception ex)
                {
                    // 记录异常
                    System.Diagnostics.Debug.WriteLine($"异常: {ex.Message}");
                    ModelState.AddModelError("", "保存班级时发生错误，请重试。");
                }
            }

            ViewBag.Schools = _context.Schools.ToList();
            return View(classEntity);
        }

        // 编辑班级视图
        public async Task<IActionResult> EditClass(int id)
        {
            var classEntity = await _context.Classes.FindAsync(id);
            if (classEntity == null)
            {
                return NotFound();
            }

            ViewBag.Schools = _context.Schools.ToList();
            return View(classEntity);
        }

        // 编辑班级处理
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditClass(int id, Class classEntity)
        {
            if (id != classEntity.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(classEntity);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!await _context.Classes.AnyAsync(c => c.Id == classEntity.Id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(ManageClasses));
            }

            ViewBag.Schools = _context.Schools.ToList();
            return View(classEntity);
        }

        // 删除班级视图
        public async Task<IActionResult> DeleteClass(int id)
        {
            var classEntity = await _context.Classes
                .Include(c => c.School)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (classEntity == null)
            {
                return NotFound();
            }

            return View(classEntity);
        }

        // 删除班级处理
        [HttpPost, ActionName("DeleteClass")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteClassConfirmed(int id)
        {
            // 检查是否有关联的学生
            bool hasStudents = await _context.Students.AnyAsync(s => s.ClassId == id);

            if (hasStudents)
            {
                TempData["ErrorMessage"] = "该班级下有关联的学生，无法删除。";
                return RedirectToAction(nameof(ManageClasses));
            }

            var classEntity = await _context.Classes.FindAsync(id);
            if (classEntity != null)
            {
                _context.Classes.Remove(classEntity);
                await _context.SaveChangesAsync();
            }

            return RedirectToAction(nameof(ManageClasses));
        }

        #endregion
    }
}