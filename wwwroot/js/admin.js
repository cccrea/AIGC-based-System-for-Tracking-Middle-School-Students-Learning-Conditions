/**
 * 管理员界面
 * 智领学程管理系统
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function () {
    // 获取侧边栏切换按钮
    const sidebarToggle = document.getElementById('sidebarToggle');

    // 添加切换事件
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function (e) {
            e.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');

            // 保存状态到本地存储
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

    // 从本地存储加载之前的状态
    if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        document.body.classList.add('sb-sidenav-toggled');
    }

    // 初始化固定导航栏
    document.body.classList.add('sb-nav-fixed');

    // 添加自动消失的通知功能
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(function (alert) {
        // 5秒后自动关闭通知
        setTimeout(function () {
            if (alert && alert.parentNode) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });

    // 添加确认删除功能
    const deleteButtons = document.querySelectorAll('a[href*="Delete"]');
    deleteButtons.forEach(function (button) {
        button.addEventListener('click', function (e) {
            if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) {
                e.preventDefault();
            }
        });
    });

    // 激活当前页面的导航链接
    activateCurrentNavLink();

    // 自定义表单验证样式
    customizeFormValidation();
});

/**
 * 激活当前页面的导航链接
 */
function activateCurrentNavLink() {
    const currentUrl = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(function (link) {
        const href = link.getAttribute('href');
        if (href && currentUrl.includes(href)) {
            link.classList.add('active');
        }
    });
}

/**
 * 自定义表单验证样式
 */
function customizeFormValidation() {
    // 获取所有表单
    const forms = document.querySelectorAll('.needs-validation');

    // 循环遍历表单并阻止提交
    Array.from(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });
}

/**
 * 初始化简单数据表格
 * @param {string} id - 表格的ID
 * @param {Object} options - 数据表格选项
 */
function initDataTable(id, options = {}) {
    const table = document.getElementById(id);
    if (table) {
        const defaultOptions = {
            perPage: 10,
            perPageSelect: [5, 10, 15, 20, 25],
            labels: {
                placeholder: "搜索...",
                perPage: "{select} 条/页",
                noRows: "无数据",
                info: "显示第 {start} 至 {end} 条记录，共 {rows} 条"
            }
        };

        // 合并默认选项和自定义选项
        const mergedOptions = Object.assign({}, defaultOptions, options);

        new simpleDatatables.DataTable(table, mergedOptions);
    }
}

/**
 * 显示消息通知
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, danger, warning, info)
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show m-3`;
    notification.setAttribute('role', 'alert');

    // 设置图标
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'danger') icon = 'exclamation-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';

    // 设置内容
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="关闭"></button>
    `;

    // 添加到页面
    const mainContent = document.querySelector('#layoutSidenav_content main');
    if (mainContent) {
        mainContent.insertBefore(notification, mainContent.firstChild);

        // 5秒后自动消失
        setTimeout(function () {
            if (notification && notification.parentNode) {
                const bsAlert = new bootstrap.Alert(notification);
                bsAlert.close();
            }
        }, 5000);
    }
}