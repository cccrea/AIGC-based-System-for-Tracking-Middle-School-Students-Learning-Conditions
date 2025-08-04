using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using test4.Models;

namespace test4.Controllers
{
    public class StudentsController : Controller
    {
        private readonly AcademicDbContext _context;

        public StudentsController(AcademicDbContext context)
        {
            _context = context;
        }

        // GET: Students
        public async Task<IActionResult> Index()
        {
            var students = await _context.Students.ToListAsync();
            return View(students); 
        }
        public async Task<IActionResult> Student(string account, string name)
        {
            if (account == null)
            {
                return NotFound();
            }

            // 从数据库中获取学生信息
            var student = await _context.Students.FirstOrDefaultAsync(s => s.Account == account);
            if (student == null)
            {
                return NotFound();
            }

            // 获取该学生的所有会话，包括创建时间
            var conversations = await _context.StudentConversations
                .Where(c => c.StudentAccount == account)
                .OrderByDescending(c => c.CreatedTime) // 按创建时间降序排序，最新的在前面
                .ToListAsync();

            // 按学科分组会话
            var conversationsBySubject = conversations
                .GroupBy(c => c.Subject)
                .ToDictionary(g => g.Key, g => g.ToList());

            // 构建模型
            var model = new ChatViewModel
            {
                StudentName = student.Name,
                StudentAccount = student.Account,
                ConversationsBySubject = conversationsBySubject
            };

            // 将模型传递给视图
            return View(model);
        }

        // GET: Students/Details/5
        public async Task<IActionResult> Details(string id)
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

        // GET: Students/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Students/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("ParentAccount,ChineseTeacherAccount,MathTeacherAccount,EnglishTeacherAccount,Account,Name,PhoneNumber,Password")] Student student)
        {
            if (ModelState.IsValid)
            {
                _context.Add(student);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(student);
        }

        // GET: Students/Edit/5
        public async Task<IActionResult> Edit(string id)
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
            return View(student);
        }

        // POST: Students/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, [Bind("ParentAccount,ChineseTeacherAccount,MathTeacherAccount,EnglishTeacherAccount,Account,Name,PhoneNumber,Password")] Student student)
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
                    if (!StudentExists(student.Account))
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
            return View(student);
        }

        // GET: Students/Delete/5
        public async Task<IActionResult> Delete(string id)
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
        public async Task<IActionResult> Chat(string id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var student = await _context.Students.FirstOrDefaultAsync(m => m.Account == id);
            if (student == null)
            {
                return NotFound();
            }

            var conversations = await _context.StudentConversations
                .Where(c => c.StudentAccount == id)
                .ToListAsync();

            // 按学科分组会话
            var conversationsBySubject = conversations
                .GroupBy(c => c.Subject)
                .ToDictionary(g => g.Key, g => g.ToList());

            var model = new ChatViewModel
            {
                StudentName = student.Name,
                StudentAccount = student.Account,
                ConversationsBySubject = conversationsBySubject
            };

            return View(model);
        }


        // POST: Students/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(string id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student != null)
            {
                _context.Students.Remove(student);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool StudentExists(string id)
        {
            return _context.Students.Any(e => e.Account == id);
        }
    }
}
