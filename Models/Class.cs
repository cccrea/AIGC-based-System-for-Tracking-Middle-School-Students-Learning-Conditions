using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace test4.Models
{
    public class Class
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "请输入班级名称")]
        [Display(Name = "班级名称")]
        public string Name { get; set; }

        [Display(Name = "年级")]
        public string Grade { get; set; }

        [Required(ErrorMessage = "请选择所属学校")]
        [Display(Name = "所属学校")]
        public int SchoolId { get; set; }

        // 导航属性
        [ForeignKey("SchoolId")]
        public virtual School? School { get; set; }

        public virtual ICollection<Student>? Students { get; set; }
    }
}