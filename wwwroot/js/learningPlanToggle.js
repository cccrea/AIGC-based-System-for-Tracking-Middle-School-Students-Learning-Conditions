/**
 * 学习计划功能控制脚本
 * 控制学习计划界面的显示和隐藏
 */
document.addEventListener('DOMContentLoaded', function () {
    // 获取元素引用
    const learningPlanBtn = document.getElementById('toggle-learning-plan-btn');
    const learningPlanContainer = document.getElementById('learning-plan-container');
    const chatContainer = document.getElementById('chat-container');
    const emptyStateContainer = document.getElementById('empty-state-container');

    // 初始隐藏学习计划容器
    if (learningPlanContainer) {
        learningPlanContainer.style.display = 'none';
    }

    // 绑定学习计划按钮点击事件
    if (learningPlanBtn) {
        learningPlanBtn.addEventListener('click', function () {
            // 切换学习计划容器的显示状态
            if (learningPlanContainer.style.display === 'none') {
                // 显示学习计划容器
                learningPlanContainer.style.display = 'block';

                // 隐藏聊天相关容器
                if (chatContainer) chatContainer.style.display = 'none';
                if (emptyStateContainer) emptyStateContainer.style.display = 'none';

                // 更新按钮文本
                learningPlanBtn.innerHTML = '<i class="fas fa-comments"></i> 返回聊天界面';

                // 初始化学习计划功能
                if (window.enhancedLearningPlanManager) {
                    // 如果管理器已存在，刷新UI
                    window.enhancedLearningPlanManager.updateUI();
                } else {
                    // 创建新的学习计划管理器
                    const planManager = new EnhancedLearningPlanManager();
                    window.enhancedLearningPlanManager = planManager;
                }
            } else {
                // 隐藏学习计划容器
                learningPlanContainer.style.display = 'none';

                // 根据当前状态显示聊天或空白状态
                const selectedTask = document.querySelector('.task.selected');
                if (selectedTask && chatContainer) {
                    chatContainer.style.display = 'flex';
                    if (emptyStateContainer) emptyStateContainer.style.display = 'none';
                } else if (emptyStateContainer) {
                    emptyStateContainer.style.display = 'block';
                    if (chatContainer) chatContainer.style.display = 'none';
                }

                // 更新按钮文本
                learningPlanBtn.innerHTML = '<i class="fas fa-tasks"></i> 学习计划';
            }
        });
    }
});