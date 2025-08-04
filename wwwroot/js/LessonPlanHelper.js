document.addEventListener('DOMContentLoaded', function () {
    const generateButton = document.getElementById('generateLessonPlan');
    const generatedContentArea = document.getElementById('generatedContent');
    const aiGeneratedContentCard = document.getElementById('aiGeneratedContent');
    const downloadButton = aiGeneratedContentCard.querySelector('.btn-success');
    const editButton = aiGeneratedContentCard.querySelector('.btn-primary');
    const saveButton = aiGeneratedContentCard.querySelector('.btn-info');

    let downloadUrl = null;

    // 收集教案表单数据
    function collectLessonPlanData() {
        return {
            Input: JSON.stringify({
                topic: document.getElementById('topic').value,
                lessonTime: document.getElementById('lesson-time').value,
                preparation: document.getElementById('preparation').value,
                goals: document.getElementById('goals').value,
                keyPoints: document.getElementById('key-points').value,
                difficulties: document.getElementById('difficulties').value,
                intro: document.getElementById('intro').value,
                teachingSteps: document.getElementById('teaching-steps').value
            })
        };
    }

    // 生成教案
    generateButton.addEventListener('click', async function () {
        const btn = this;
        const originalText = btn.innerHTML;

        try {
            // 显示加载状态
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> 正在生成...';
            btn.disabled = true;

            // 收集表单数据
            const requestData = collectLessonPlanData();

            // 发送请求到后端
            const response = await fetch('/api/LessonPlan/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (response.ok && result.output) {
                // 保存下载链接
                downloadUrl = result.output;

                // 显示生成的内容卡片
                aiGeneratedContentCard.style.display = 'block';

                // 在内容区域显示提示
                generatedContentArea.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-2"></i> 教案已成功生成！点击"下载教案"按钮获取完整内容。
                    </div>
                `;

                // 滚动到结果区域
                aiGeneratedContentCard.scrollIntoView({ behavior: 'smooth' });
            } else {
                // 处理错误情况
                throw new Error(result.message || '生成教案失败');
            }
        } catch (error) {
            console.error('生成教案出错:', error);
            generatedContentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> ${error.message || '生成教案时发生未知错误'}
                </div>
            `;
        } finally {
            // 恢复按钮状态
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // 下载教案
    downloadButton.addEventListener('click', function () {
        if (downloadUrl) {
            // 创建一个临时链接并触发下载
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert('尚未生成教案，请先点击"生成教案"按钮');
        }
    });

    // 编辑按钮事件
    editButton.addEventListener('click', function () {
        // 这里可以添加编辑逻辑，例如允许用户修改生成的内容
        alert('编辑功能暂未实现');
    });

    // 保存到教案库按钮事件
    saveButton.addEventListener('click', function () {
        // 这里可以添加保存到教案库的逻辑
        alert('保存到教案库功能暂未实现');
    });
});