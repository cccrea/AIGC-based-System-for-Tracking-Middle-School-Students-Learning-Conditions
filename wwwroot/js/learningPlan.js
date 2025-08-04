/**
 * 增强版学习计划功能
 * 通过API请求获取实际数据，不再使用假数据
 */

class EnhancedLearningPlanManager {
    constructor() {
        // 基本属性
        this.step = 1; // 1: 创建计划, 2: 预览计划, 3: 执行计划
        this.subject = "语文";  // 默认语文
        this.duration = 7; // 默认7天
        this.plan = null;
        this.reflection = "";
        this.feedback = "";
        this.dragItem = null;
        this.dragOverItem = null;
        this.loading = false;
        this.currentPlan = null;

        // UI元素引用
        this.planContainer = document.getElementById('learning-plan-container');
        this.formContainer = document.getElementById('create-plan-form');
        this.previewContainer = document.getElementById('plan-preview');
        this.executeContainer = document.getElementById('execute-plan');

        // 初始化
        this.init();
    }

    // 初始化函数
    init() {
        // 确保UI元素存在
        if (!this.planContainer) {
            console.error('未找到学习计划容器元素');
            return;
        }

        // 为页面添加图标引用
        this.addFontAwesome();

        // 绑定事件
        this.bindEvents();

        // 更新UI
        this.updateUI();

        // 添加进度指示器
        this.addProgressIndicator();

        // 加载学生的现有计划
        this.loadStudentPlans();
    }

    // 为页面添加FontAwesome图标
    addFontAwesome() {
        if (!document.getElementById('fontawesome-css')) {
            const link = document.createElement('link');
            link.id = 'fontawesome-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(link);
        }
    }

    // 添加进度指示器
    addProgressIndicator() {
        // 创建进度指示器容器
        const progressIndicator = document.createElement('div');
        progressIndicator.className = 'progress-indicator';
        progressIndicator.id = 'progress-indicator';

        // 添加三个步骤
        const steps = [
            { icon: 'fa-pencil-alt', text: '创建计划' },
            { icon: 'fa-eye', text: '预览计划' },
            { icon: 'fa-play', text: '执行计划' }
        ];

        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = `progress-step ${index + 1 === this.step ? 'active' : ''}`;
            stepElement.dataset.step = index + 1;

            stepElement.innerHTML = `
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-text">${step.text}</div>
            `;

            progressIndicator.appendChild(stepElement);
        });

        // 将进度指示器添加到容器的顶部
        if (this.formContainer.parentNode) {
            this.formContainer.parentNode.insertBefore(progressIndicator, this.formContainer);
        }
    }

    // 更新进度指示器
    updateProgressIndicator() {
        const indicators = document.querySelectorAll('.progress-step');
        indicators.forEach((indicator, index) => {
            // 设置当前步骤为活动状态
            if (index + 1 === this.step) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }

            // 设置已完成步骤
            if (index + 1 < this.step) {
                indicator.classList.add('completed');
            } else {
                indicator.classList.remove('completed');
            }
        });
    }

    // 绑定事件
    bindEvents() {
        // 绑定科目选择更改事件
        const subjectSelect = document.getElementById('subject-select');
        if (subjectSelect) {
            subjectSelect.addEventListener('change', (e) => {
                this.subject = e.target.value;
            });
        }

        // 绑定持续时间选择更改事件
        const durationSelect = document.getElementById('duration-select');
        if (durationSelect) {
            durationSelect.addEventListener('change', (e) => {
                this.duration = parseInt(e.target.value);
            });
        }

        // 绑定生成计划按钮点击事件
        const generateButton = document.getElementById('generate-plan-btn');
        if (generateButton) {
            generateButton.addEventListener('click', () => this.generatePlan());
        }

        // 绑定返回修改按钮点击事件
        const backButton = document.getElementById('back-to-edit-btn');
        if (backButton) {
            backButton.addEventListener('click', () => this.setStep(1));
        }

        // 绑定开始执行计划按钮点击事件
        const startButton = document.getElementById('start-execute-btn');
        if (startButton) {
            startButton.addEventListener('click', () => this.setStep(3));
        }

        // 绑定返回预览按钮点击事件
        const backToPreviewButton = document.getElementById('back-to-preview-btn');
        if (backToPreviewButton) {
            backToPreviewButton.addEventListener('click', () => this.setStep(2));
        }

        // 绑定查看完整计划按钮点击事件
        const viewFullPlanButton = document.getElementById('view-full-plan-btn');
        if (viewFullPlanButton) {
            viewFullPlanButton.addEventListener('click', () => this.setStep(2));
        }

        // 绑定提交心得按钮点击事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.submit-reflection-btn')) {
                const taskElement = e.target.closest('.today-task');
                const reflectionInput = taskElement.querySelector('.reflection-input');
                const planId = this.currentPlan?.plan?.id;
                const taskId = taskElement.dataset.taskId;

                if (planId && taskId && reflectionInput) {
                    this.submitReflection(planId, taskId, reflectionInput.value);
                }
            }
        });

        // 绑定任务状态切换点击事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.status-toggle')) {
                const taskElement = e.target.closest('.today-task');
                const planId = this.currentPlan?.plan?.id;
                const taskId = taskElement.dataset.taskId;
                const isCompleted = taskElement.classList.contains('task-completed');

                if (planId && taskId) {
                    this.toggleTaskCompletion(planId, taskId, !isCompleted);
                }
            }
        });

        // 绑定拖放事件
        this.setupDragAndDrop();
    }

    // 设置拖放事件
    setupDragAndDrop() {
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('dragenter', this.handleDragEnter.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
    }

    // 设置当前步骤
    setStep(step) {
        this.step = step;
        this.updateUI();
        this.updateProgressIndicator();

        // 平滑滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 加载学生的现有计划
    async loadStudentPlans() {
        try {
            // 获取学生账号
            const studentAccount = document.getElementById('student-account').innerText.trim();

            // 发起API请求
            const response = await fetch(`/LearningPlan/GetPlans?studentAccount=${studentAccount}`);
            const result = await response.json();

            if (result.code === 0 && result.data) {
                // 检查是否有计划
                if (result.data.length > 0) {
                    // 添加现有计划列表到UI
                    this.addExistingPlansToUI(result.data);
                }
            } else {
                console.error('获取学习计划失败:', result.msg);
            }
        } catch (error) {
            console.error('加载学生计划时出错:', error);
        }
    }

    // 添加现有计划到UI
    addExistingPlansToUI(plans) {
        const container = document.createElement('div');
        container.className = 'existing-plans-container';

        const title = document.createElement('h3');
        title.className = 'existing-plans-title';
        title.innerHTML = '<i class="fas fa-history"></i> 我的学习计划记录';
        container.appendChild(title);

        const plansList = document.createElement('div');
        plansList.className = 'existing-plans-list';

        plans.forEach(plan => {
            const planItem = document.createElement('div');
            planItem.className = 'existing-plan-item';

            // 格式化日期
            const startDate = new Date(plan.startDate);
            const endDate = new Date(plan.endDate);
            const formattedDateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

            // 设置计划项目内容
            planItem.innerHTML = `
                <div class="plan-item-info">
                    <div class="plan-item-title">${plan.title}</div>
                    <div class="plan-item-dates">${formattedDateRange}</div>
                    <div class="plan-item-status ${plan.status === '进行中' ? 'status-active' : 'status-completed'}">${plan.status}</div>
                </div>
                <button class="view-plan-btn" data-plan-id="${plan.id}">
                    <i class="fas fa-eye"></i> 查看
                </button>
            `;

            plansList.appendChild(planItem);
        });

        container.appendChild(plansList);

        // 将容器添加到创建计划表单前
        if (this.formContainer) {
            this.formContainer.parentNode.insertBefore(container, this.formContainer);

            // 为查看按钮添加事件监听
            const viewButtons = container.querySelectorAll('.view-plan-btn');
            viewButtons.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const planId = btn.getAttribute('data-plan-id');
                    await this.loadPlanDetails(planId);
                });
            });
        }
    }

    // 加载计划详情
    async loadPlanDetails(planId) {
        try {
            this.loading = true;
            this.updateGenerateButtonState();

            // 发起API请求获取计划详情
            const response = await fetch(`/LearningPlan/GetPlanDetails?planId=${planId}`);
            const result = await response.json();

            if (result.code === 0 && result.data) {
                // 保存计划数据
                this.currentPlan = result.data;

                // 生成展示格式的数据
                this.plan = {
                    startDate: result.data.plan.startDate,
                    endDate: result.data.plan.endDate,
                    recommendedPath: result.data.plan.recommendedPath,
                    dailyTasks: result.data.dailyTasks
                };

                this.loading = false;
                this.updateGenerateButtonState();

                // 切换到计划预览界面
                this.setStep(2);

                // 如果计划仍在进行中，显示今日任务按钮
                const currentDate = new Date().toISOString().split('T')[0];
                const hasTodayTasks = result.data.dailyTasks.some(day => day.date === currentDate);

                if (hasTodayTasks && result.data.plan.status === '进行中') {
                    // 显示今日任务按钮
                    const startExecuteBtn = document.getElementById('start-execute-btn');
                    if (startExecuteBtn) {
                        startExecuteBtn.style.display = 'block';
                        startExecuteBtn.textContent = '查看今日任务';
                    }
                } else {
                    // 隐藏今日任务按钮
                    const startExecuteBtn = document.getElementById('start-execute-btn');
                    if (startExecuteBtn) {
                        startExecuteBtn.style.display = 'none';
                    }
                }

                this.showToast('学习计划加载成功', 'success');
            } else {
                this.loading = false;
                this.updateGenerateButtonState();
                this.showToast('加载计划详情失败: ' + result.msg, 'error');
            }
        } catch (error) {
            this.loading = false;
            this.updateGenerateButtonState();
            console.error('加载计划详情时出错:', error);
            this.showToast('加载计划详情失败，请稍后重试', 'error');
        }
    }

    // 生成学习计划
    async generatePlan() {
        if (!this.subject || this.duration <= 0) {
            this.showToast('请选择学科和持续时间', 'warning');
            return;
        }

        this.loading = true;
        this.updateGenerateButtonState();

        try {
            // 获取学生账号
            const studentAccount = document.getElementById('student-account').innerText.trim();

            // 构建请求数据
            const requestData = {
                studentAccount: studentAccount,
                subject: this.subject,
                duration: this.duration
            };

            // 发送请求到后端生成计划
            const response = await fetch('/LearningPlan/Generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.code === 0 && result.data) {
                // 保存计划数据
                this.currentPlan = result.data;

                // 设置计划数据
                this.plan = {
                    startDate: result.data.startDate,
                    endDate: result.data.endDate,
                    recommendedPath: result.data.recommendedPath,
                    dailyTasks: result.data.dailyTasks
                };

                this.loading = false;
                this.updateGenerateButtonState();

                // 切换到预览步骤
                this.setStep(2);

                // 显示成功提示
                this.showToast('学习计划生成成功', 'success');
            } else {
                this.loading = false;
                this.updateGenerateButtonState();
                this.showToast('生成学习计划失败: ' + (result.msg || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('生成学习计划错误:', error);
            this.loading = false;
            this.updateGenerateButtonState();
            this.showToast('生成学习计划失败，请稍后重试', 'error');
        }
    }
    // 更新生成按钮状态
    updateGenerateButtonState() {
        const button = document.getElementById('generate-plan-btn');
        if (!button) return;

        if (this.loading) {
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span> 正在生成...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-magic"></i> 生成学习计划';
        }
    }

    // 提交学习心得并切换任务状态
    async submitReflection(planId, taskId, reflection) {
        if (!reflection.trim()) {
            this.showToast('请输入您的学习心得', 'warning');
            return;
        }

        try {
            // 添加加载效果
            const submitButton = document.querySelector('.submit-reflection-btn');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="loading-spinner"></span> 提交中...';
            }

            // 发送请求更新任务状态和心得
            const response = await fetch('/LearningPlan/UpdateTaskStatus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    planId: planId,
                    taskId: taskId,
                    completed: true,  // 提交心得时自动标记为完成
                    reflection: reflection
                })
            });

            const result = await response.json();

            // 恢复按钮状态
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 提交心得';
            }

            if (result.code === 0) {
                // 清空输入框
                const reflectionInput = document.querySelector('.reflection-input');
                if (reflectionInput) {
                    reflectionInput.value = '';
                }

                // 标记任务为已完成
                const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
                if (taskItem) {
                    taskItem.classList.add('task-completed');

                    // 更新任务描述样式
                    const taskDescription = taskItem.querySelector('.task-description');
                    if (taskDescription) {
                        taskDescription.classList.add('completed');
                    }

                    // 更新状态图标
                    const statusToggle = taskItem.querySelector('.status-toggle');
                    if (statusToggle) {
                        statusToggle.innerHTML = '<i class="fas fa-check-circle complete-icon"></i>';
                    }
                }

                // 新增：如果任务完成管理器存在，显示庆祝弹窗
                if (window.taskCompletionManager) {
                    // 获取任务内容
                    const taskContent = taskItem?.querySelector('.task-description')?.textContent || '';
                    // 显示庆祝弹窗
                    window.taskCompletionManager.showCompletionFeedback(reflection);
                }


                // 刷新计划数据
                if (this.currentPlan?.plan?.id) {
                    await this.loadPlanDetails(this.currentPlan.plan.id);
                }
            } else {
                this.showToast('提交失败: ' + (result.msg || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('提交学习心得错误:', error);
            this.showToast('提交学习心得失败，请稍后重试', 'error');
        }
    }

    // 切换任务完成状态
    async toggleTaskCompletion(planId, taskId, completed) {
        try {
            // 发送请求更新任务状态
            const response = await fetch('/LearningPlan/UpdateTaskStatus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    planId: planId,
                    taskId: taskId,
                    completed: completed
                })
            });

            const result = await response.json();

            if (result.code === 0) {
                // 更新任务UI状态
                const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
                if (taskItem) {
                    if (completed) {
                        taskItem.classList.add('task-completed');

                        // 更新任务描述样式
                        const taskDescription = taskItem.querySelector('.task-description');
                        if (taskDescription) {
                            taskDescription.classList.add('completed');
                        }

                        // 更新状态图标
                        const statusToggle = taskItem.querySelector('.status-toggle');
                        if (statusToggle) {
                            statusToggle.innerHTML = '<i class="fas fa-check-circle complete-icon"></i>';
                        }

                        this.showToast('任务已完成，继续加油！', 'success');
                    } else {
                        taskItem.classList.remove('task-completed');

                        // 更新任务描述样式
                        const taskDescription = taskItem.querySelector('.task-description');
                        if (taskDescription) {
                            taskDescription.classList.remove('completed');
                        }

                        // 更新状态图标
                        const statusToggle = taskItem.querySelector('.status-toggle');
                        if (statusToggle) {
                            statusToggle.innerHTML = '<i class="far fa-circle incomplete-icon"></i>';
                        }

                        this.showToast('任务已标记为未完成', 'info');
                    }
                }

                // 刷新计划数据
                if (this.currentPlan?.plan?.id) {
                    await this.loadPlanDetails(this.currentPlan.plan.id);
                }
            } else {
                this.showToast('更新任务状态失败: ' + (result.msg || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('更新任务状态错误:', error);
            this.showToast('更新任务状态失败，请稍后重试', 'error');
        }
    }

    // 处理拖动开始
    handleDragStart(e) {
        if (!e.target.classList.contains('task-item')) return;

        const dayIndex = parseInt(e.target.dataset.dayIndex);
        const taskIndex = parseInt(e.target.dataset.taskIndex);

        this.dragItem = { dayIndex, taskIndex };
        e.dataTransfer.effectAllowed = 'move';

        // 添加拖动样式
        setTimeout(() => {
            e.target.classList.add('task-dragging');
        }, 0);
    }

    // 处理拖动结束
    handleDragEnd(e) {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('task-dragging');
        }

        this.dragItem = null;
        this.dragOverItem = null;

        // 移除所有拖动样式
        document.querySelectorAll('.task-dragover').forEach(el => {
            el.classList.remove('task-dragover');
        });
    }

    // 处理拖动经过
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    // 处理拖动进入
    handleDragEnter(e) {
        e.preventDefault();

        const taskItem = e.target.closest('.task-item');
        const dropZone = e.target.closest('.drop-zone');

        if (taskItem) {
            const dayIndex = parseInt(taskItem.dataset.dayIndex);
            const taskIndex = parseInt(taskItem.dataset.taskIndex);

            if (this.dragItem && (this.dragItem.dayIndex !== dayIndex || this.dragItem.taskIndex !== taskIndex)) {
                this.dragOverItem = { dayIndex, taskIndex };
                taskItem.classList.add('task-dragover');
            }
        } else if (dropZone) {
            const dayIndex = parseInt(dropZone.dataset.dayIndex);
            const taskCount = parseInt(dropZone.dataset.taskCount);

            this.dragOverItem = { dayIndex, taskIndex: taskCount };
            dropZone.classList.add('task-dragover');
        }
    }

    // 处理拖动离开
    handleDragLeave(e) {
        const taskItem = e.target.closest('.task-item');
        const dropZone = e.target.closest('.drop-zone');

        if (taskItem) {
            taskItem.classList.remove('task-dragover');
        } else if (dropZone) {
            dropZone.classList.remove('task-dragover');
        }
    }

    // 处理放置
    handleDrop(e) {
        e.preventDefault();

        // 禁止拖放功能修改，只保留视觉效果
        this.showToast('学习计划任务顺序已固定', 'info');

        // 移除所有拖动样式
        document.querySelectorAll('.task-dragover').forEach(el => {
            el.classList.remove('task-dragover');
        });

        // 清除拖动状态
        this.dragItem = null;
        this.dragOverItem = null;
    }

    // 显示通知提示
    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // 设置图标
        let icon;
        switch (type) {
            case 'success':
                icon = 'fa-check-circle';
                break;
            case 'warning':
                icon = 'fa-exclamation-triangle';
                break;
            case 'error':
                icon = 'fa-times-circle';
                break;
            default:
                icon = 'fa-info-circle';
        }

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        // 将toast添加到页面
        document.body.appendChild(toast);

        // 淡入效果
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // 3秒后淡出并移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';

            // 动画完成后移除元素
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 更新UI
    updateUI() {
        if (!this.planContainer) return;

        // 隐藏所有容器
        if (this.formContainer) this.formContainer.style.display = 'none';
        if (this.previewContainer) this.previewContainer.style.display = 'none';
        if (this.executeContainer) this.executeContainer.style.display = 'none';

        // 更新进度指示器
        this.updateProgressIndicator();

        // 根据当前步骤显示相应内容
        switch (this.step) {
            case 1:
                // 显示创建计划表单
                if (this.formContainer) {
                    this.formContainer.style.display = 'block';
                }
                break;
            case 2:
                // 显示计划预览
                if (this.previewContainer) {
                    this.previewContainer.style.display = 'block';
                    this.renderPlanPreview();
                }
                break;
            case 3:
                // 显示执行计划
                if (this.executeContainer) {
                    this.executeContainer.style.display = 'block';
                    this.renderExecutePlan();
                }
                break;
        }
    }

    // 渲染计划预览
    renderPlanPreview() {
        if (!this.plan) return;

        const dayContainer = document.getElementById('plan-days-container');
        if (!dayContainer) return;

        // 清空容器
        dayContainer.innerHTML = '';

        // 更新推荐学习路径
        const pathElement = document.getElementById('recommended-path');
        if (pathElement) {
            pathElement.textContent = this.plan.recommendedPath;
        }

        // 添加每天的内容
        this.plan.dailyTasks.forEach((day, dayIndex) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';

            // 格式化日期
            const dayDate = new Date(day.date);
            const formattedDate = dayDate.toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });

            // 日期标题
            const dayTitle = document.createElement('h3');
            dayTitle.className = 'day-title';
            dayTitle.innerHTML = `<i class="fas fa-calendar-day"></i> ${formattedDate}`;
            dayCard.appendChild(dayTitle);

            // 添加任务
            day.tasks.forEach((task, taskIndex) => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.draggable = true;
                taskItem.dataset.dayIndex = dayIndex;
                taskItem.dataset.taskIndex = taskIndex;
                taskItem.dataset.taskId = task.id;

                // 设置任务边框颜色
                this.setTaskSubjectColor(taskItem, task.subject);

                // 标记已完成状态
                if (task.completed) {
                    taskItem.classList.add('completed-task');
                }

                // 任务科目和难度
                const taskHeader = document.createElement('div');
                taskHeader.className = 'task-header';

                const subjectSpan = document.createElement('span');
                subjectSpan.className = 'task-subject';
                subjectSpan.innerHTML = `<i class="fas fa-book"></i> ${task.subject}`;
                this.setTextColor(subjectSpan, task.subject);

                const difficultySpan = document.createElement('span');
                difficultySpan.className = `task-difficulty difficulty-${task.difficulty.toLowerCase()}`;

                // 添加难度图标
                let difficultyIcon;
                switch (task.difficulty.toLowerCase()) {
                    case '简单':
                        difficultyIcon = 'fa-smile';
                        break;
                    case '中等':
                        difficultyIcon = 'fa-meh';
                        break;
                    case '困难':
                        difficultyIcon = 'fa-dizzy';
                        break;
                    default:
                        difficultyIcon = 'fa-question';
                }

                difficultySpan.innerHTML = `<i class="far ${difficultyIcon}"></i> ${task.difficulty}`;

                taskHeader.appendChild(subjectSpan);
                taskHeader.appendChild(difficultySpan);
                taskItem.appendChild(taskHeader);

                // 任务内容
                const taskContent = document.createElement('p');
                taskContent.className = 'task-content';
                taskContent.textContent = task.content;
                taskItem.appendChild(taskContent);

                // 知识点标签
                const pointTag = document.createElement('div');
                pointTag.className = 'knowledge-point-tag';
                pointTag.innerHTML = `<i class="fas fa-tag"></i> ${task.point}`;
                taskItem.appendChild(pointTag);

                // 如果任务有心得，显示
                if (task.reflection) {
                    const reflectionNote = document.createElement('div');
                    reflectionNote.className = 'reflection-note';
                    reflectionNote.innerHTML = `<i class="fas fa-comment"></i> 学习心得: ${task.reflection}`;
                    taskItem.appendChild(reflectionNote);
                }

                dayCard.appendChild(taskItem);
            });

            // 移除拖放区域，改为完成状态提示
            const completionInfo = document.createElement('div');
            completionInfo.className = 'day-completion-info';

            const completedCount = day.tasks.filter(task => task.completed).length;
            const totalCount = day.tasks.length;
            const completionPercentage = Math.round(completedCount / totalCount * 100);

            completionInfo.innerHTML = `
                <div class="completion-progress">
                    <div class="progress-bar" style="width: ${completionPercentage}%"></div>
                </div>
                <div class="completion-text">
                    <i class="fas fa-tasks"></i> 完成进度: ${completedCount}/${totalCount} (${completionPercentage}%)
                </div>
            `;

            dayCard.appendChild(completionInfo);

            dayContainer.appendChild(dayCard);
        });
    }

    // 渲染执行计划
    renderExecutePlan() {
        if (!this.plan) return;

        // 获取今日任务容器
        const tasksContainer = document.getElementById('today-tasks-container');
        if (!tasksContainer) return;

        // 清空容器
        tasksContainer.innerHTML = '';

        // 获取今天的日期
        const today = new Date().toISOString().split('T')[0];

        // 查找今天的任务
        const todayTasks = this.plan.dailyTasks.find(day => day.date === today);

        // 如果没有今天的任务，显示提示信息
        if (!todayTasks || !todayTasks.tasks || todayTasks.tasks.length === 0) {
            const noTasksMessage = document.createElement('div');
            noTasksMessage.className = 'no-tasks-message';
            noTasksMessage.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <h4 class="empty-title">今天没有计划任务</h4>
                    <p class="empty-text">您今天没有需要完成的任务，可以查看其他日期的计划安排。</p>
                </div>
            `;
            tasksContainer.appendChild(noTasksMessage);
            return;
        }

        // 显示今日任务
        todayTasks.tasks.forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.className = task.completed ? 'today-task task-completed' : 'today-task';
            taskElement.dataset.taskId = task.id;

            // 添加完成状态切换
            const statusToggle = document.createElement('div');
            statusToggle.className = 'status-toggle';
            statusToggle.innerHTML = task.completed ?
                '<i class="fas fa-check-circle complete-icon"></i>' :
                '<i class="far fa-circle incomplete-icon"></i>';

            taskElement.appendChild(statusToggle);

            // 任务内容容器
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content-container';

            // 科目和难度
            const taskHeader = document.createElement('div');
            taskHeader.className = 'task-header';

            const subjectSpan = document.createElement('span');
            subjectSpan.className = 'task-subject';
            subjectSpan.innerHTML = `<i class="fas fa-book"></i> ${task.subject}`;
            this.setTextColor(subjectSpan, task.subject);

            const difficultySpan = document.createElement('span');
            difficultySpan.className = `task-difficulty difficulty-${task.difficulty.toLowerCase()}`;

            // 添加难度图标
            let difficultyIcon;
            switch (task.difficulty.toLowerCase()) {
                case '简单':
                    difficultyIcon = 'fa-smile';
                    break;
                case '中等':
                    difficultyIcon = 'fa-meh';
                    break;
                case '困难':
                    difficultyIcon = 'fa-dizzy';
                    break;
                default:
                    difficultyIcon = 'fa-question';
            }

            difficultySpan.innerHTML = `<i class="far ${difficultyIcon}"></i> ${task.difficulty}`;

            taskHeader.appendChild(subjectSpan);
            taskHeader.appendChild(difficultySpan);
            taskContent.appendChild(taskHeader);

            // 任务描述
            const taskDescription = document.createElement('p');
            taskDescription.className = task.completed ? 'task-description completed' : 'task-description';
            taskDescription.textContent = task.content;
            taskContent.appendChild(taskDescription);

            // 知识点标签
            const pointTag = document.createElement('div');
            pointTag.className = 'knowledge-point-tag';
            pointTag.innerHTML = `<i class="fas fa-tag"></i> ${task.point}`;
            taskContent.appendChild(pointTag);

            // 学习心得部分
            const reflectionContainer = document.createElement('div');
            reflectionContainer.className = 'reflection-container';

            const reflectionTitle = document.createElement('div');
            reflectionTitle.className = 'reflection-title';
            reflectionTitle.innerHTML = '<i class="fas fa-pen"></i> 今日学习心得';
            reflectionContainer.appendChild(reflectionTitle);

            // 如果已经有心得，显示，否则显示输入框
            if (task.reflection) {
                const reflectionContent = document.createElement('div');
                reflectionContent.className = 'reflection-content';
                reflectionContent.textContent = task.reflection;
                reflectionContainer.appendChild(reflectionContent);

                // 添加编辑按钮
                const editReflectionBtn = document.createElement('button');
                editReflectionBtn.className = 'edit-reflection-btn';
                editReflectionBtn.innerHTML = '<i class="fas fa-edit"></i> 编辑心得';

                editReflectionBtn.addEventListener('click', () => {
                    // 替换为文本框
                    reflectionContainer.removeChild(reflectionContent);
                    reflectionContainer.removeChild(editReflectionBtn);

                    const reflectionTextarea = document.createElement('textarea');
                    reflectionTextarea.className = 'reflection-input';
                    reflectionTextarea.placeholder = '记录今日学习心得、困惑或收获...';
                    reflectionTextarea.rows = 3;
                    reflectionTextarea.value = task.reflection;

                    const submitButton = document.createElement('button');
                    submitButton.className = 'submit-reflection-btn';
                    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 更新心得';

                    reflectionContainer.appendChild(reflectionTextarea);
                    reflectionContainer.appendChild(submitButton);
                });

                reflectionContainer.appendChild(editReflectionBtn);
            } else {
                const reflectionTextarea = document.createElement('textarea');
                reflectionTextarea.className = 'reflection-input';
                reflectionTextarea.placeholder = '记录今日学习心得、困惑或收获...';
                reflectionTextarea.rows = 3;
                reflectionTextarea.value = this.reflection;

                const submitButton = document.createElement('button');
                submitButton.className = 'submit-reflection-btn';
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 提交心得';

                reflectionContainer.appendChild(reflectionTextarea);
                reflectionContainer.appendChild(submitButton);
            }

            taskContent.appendChild(reflectionContainer);
            taskElement.appendChild(taskContent);
            tasksContainer.appendChild(taskElement);
        });

        // 更新AI反馈
        const feedbackContainer = document.getElementById('ai-feedback-container');
        if (feedbackContainer) {
            if (this.feedback) {
                feedbackContainer.style.display = 'block';
                const feedbackContent = document.getElementById('ai-feedback-content');
                if (feedbackContent) {
                    feedbackContent.textContent = this.feedback;
                }
            } else {
                feedbackContainer.style.display = 'none';
            }
        }
    }

    // 设置任务科目颜色
    setTaskSubjectColor(element, subject) {
        let color;
        switch (subject) {
            case '语文':
                color = '#f43f5e';
                break;
            case '数学':
                color = '#3b82f6';
                break;
            case '英语':
                color = '#10b981';
                break;
            default:
                color = '#8b5cf6';
        }
        element.style.borderLeftColor = color;
    }

    // 设置文字颜色
    setTextColor(element, subject) {
        let color;
        switch (subject) {
            case '语文':
                color = '#f43f5e';
                break;
            case '数学':
                color = '#3b82f6';
                break;
            case '英语':
                color = '#10b981';
                break;
            default:
                color = '#8b5cf6';
        }
        element.style.color = color;
    }
}

// 在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    // 添加CSS变量
    addCssVariables();

    // 初始化Toast样式
    initToastStyles();

    // 检查学习计划容器是否存在
    const learningPlanContainer = document.getElementById('learning-plan-container');
    if (learningPlanContainer) {
        // 添加学习计划页面标题
        enhancePlanTitle();

        // 初始化增强版学习计划管理器
        const planManager = new EnhancedLearningPlanManager();

        // 存储到全局变量供其他脚本访问
        window.enhancedLearningPlanManager = planManager;
    }
});

// 添加CSS变量
function addCssVariables() {
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --primary-color: #4f46e5;
            --primary-hover: #4338ca;
            --secondary-color: #f3f4f6;
            --secondary-hover: #e5e7eb;
            --success-color: #10b981;
            --success-hover: #059669;
            --warning-color: #f59e0b;
            --warning-hover: #d97706;
            --danger-color: #ef4444;
            --danger-hover: #dc2626;
            --text-primary: #1f2937;
            --text-secondary: #4b5563;
            --text-muted: #6b7280;
            --border-color: #e5e7eb;
            --bg-light: #f9fafb;
            --bg-white: #ffffff;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 4px 15px rgba(0, 0, 0, 0.1);
            --border-radius-sm: 6px;
            --border-radius-md: 8px;
            --border-radius-lg: 12px;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --transition-fast: 0.2s;
            --transition-normal: 0.3s;
            --transition-slow: 0.5s;
        }
        
        /* 设置步骤样式 */
        .progress-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            margin-bottom: 30px;
            z-index: 2;
        }

        .step-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: var(--secondary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            font-size: 18px;
            color: var(--text-secondary);
            transition: all var(--transition-normal);
            position: relative;
            z-index: 2;
        }

        .progress-step.active .step-icon {
            background-color: var(--primary-color);
            color: white;
            box-shadow: 0 0 0 6px rgba(79, 70, 229, 0.2);
        }

        .progress-step.completed .step-icon {
            background-color: var(--success-color);
            color: white;
        }

        .progress-step:not(:last-child)::after {
            content: '';
            position: absolute;
            top: 24px;
            left: 50%;
            width: 100%;
            height: 2px;
            background-color: var(--border-color);
            z-index: 1;
        }

        .progress-step.active:not(:last-child)::after,
        .progress-step.completed:not(:last-child)::after {
            background-color: var(--primary-color);
        }

        .step-text {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            transition: color var(--transition-normal);
        }

        .progress-step.active .step-text,
        .progress-step.completed .step-text {
            color: var(--primary-color);
            font-weight: 600;
        }

        /* 已存在计划样式 */
        .existing-plans-container {
            margin-bottom: 30px;
            background-color: #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .existing-plans-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .existing-plans-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }

        .existing-plan-item {
            background-color: var(--bg-light);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s ease;
        }

        .existing-plan-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
        }

        .plan-item-info {
            flex-grow: 1;
        }

        .plan-item-title {
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 5px;
        }

        .plan-item-dates {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }

        .plan-item-status {
            display: inline-block;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 12px;
        }

        .status-active {
            background-color: #e3f2fd;
            color: #1565c0;
        }

        .status-completed {
            background-color: #e8f5e9;
            color: #2e7d32;
        }

        .view-plan-btn {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .view-plan-btn:hover {
            background-color: var(--primary-hover);
        }

        /* 知识点标签样式 */
        .knowledge-point-tag {
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            background-color: rgba(79, 70, 229, 0.1);
            color: var(--primary-color);
            font-size: 12px;
            border-radius: 12px;
            margin-top: 8px;
        }

        .knowledge-point-tag i {
            margin-right: 4px;
            font-size: 10px;
        }

        /* 完成任务样式 */
        .completed-task {
            position: relative;
        }

        .completed-task::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 8px;
            z-index: 1;
        }

        .completed-task .task-content {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        /* 任务完成进度条 */
        .day-completion-info {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid var(--border-color);
        }

        .completion-progress {
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
        }

        .progress-bar {
            height: 100%;
            background-color: var(--success-color);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .completion-text {
            font-size: 12px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* 学习心得样式 */
        .reflection-note {
            margin-top: 10px;
            padding: 10px;
            background-color: #f0f9ff;
            border-radius: 8px;
            font-size: 13px;
            color: #0369a1;
            font-style: italic;
        }

        .reflection-note i {
            margin-right: 5px;
        }

        /* 今日任务状态切换按钮 */
        .task-completed .status-toggle {
            z-index: 2;
        }

        .edit-reflection-btn {
            margin-top: 10px;
            background-color: #e0f2fe;
            color: #0369a1;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
        }

        .edit-reflection-btn:hover {
            background-color: #bae6fd;
        }

        /* 空状态提示 */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            background-color: #f9fafb;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            color: #9ca3af;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }

        .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 10px;
        }

        .empty-text {
            color: #6b7280;
            max-width: 400px;
            margin: 0 auto;
        }

        /* 任务拖动样式 */
        .task-dragging {
            opacity: 0.6;
            transform: scale(0.95);
        }

        .task-dragover {
            border: 2px dashed #4f46e5;
            background-color: rgba(79, 70, 229, 0.05);
        }

        /* 加载动画 */
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s cubic-bezier(0.44, 0.185, 0.575, 0.86) infinite;
            margin-right: 10px;
        }
    `;
    document.head.appendChild(style);
}

// 初始化Toast样式
function initToastStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 350px;
            background-color: white;
            color: #333;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        }
        
        .toast i {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .toast-success {
            border-left: 4px solid #10b981;
        }
        
        .toast-success i {
            color: #10b981;
        }
        
        .toast-info {
            border-left: 4px solid #3b82f6;
        }
        
        .toast-info i {
            color: #3b82f6;
        }
        
        .toast-warning {
            border-left: 4px solid #f59e0b;
        }
        
        .toast-warning i {
            color: #f59e0b;
        }
        
        .toast-error {
            border-left: 4px solid #ef4444;
        }
        
        .toast-error i {
            color: #ef4444;
        }
    `;
    document.head.appendChild(style);
}

// 美化计划标题
function enhancePlanTitle() {
    const titleElement = document.querySelector('.plan-title');
    if (titleElement) {
        // 添加图标
        titleElement.innerHTML = '<i class="fas fa-graduation-cap"></i> 我的学习计划';
    }
}
