using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace test4.Models
{
    public class School
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "请输入学校名称")]
        [Display(Name = "学校名称")]
        public string Name { get; set; }

        [Display(Name = "学校地址")]
        public string Address { get; set; }

        [Display(Name = "学校联系电话")]
        public string Phone { get; set; }

        // 导航属性
        public virtual ICollection<Student>? Students { get; set; }
        public virtual ICollection<Teacher>?Teachers { get; set; }
        public virtual ICollection<Class>? Classes { get; set; }
    }
}