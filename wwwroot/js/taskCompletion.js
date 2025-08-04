/**
 * 任务完成反馈效果脚本
 * 处理学生提交学习心得后的弹窗和动效
 */

class TaskCompletionManager {
    constructor() {
        // 初始化
        this.setupEventListeners();
        this.confettiColors = [
            '#1e88e5', '#4caf50', '#ff9800', '#e91e63', '#9c27b0',
            '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50'
        ];
    }

    // 设置事件监听器
    setupEventListeners() {
        // 不再直接监听按钮点击事件，而是由 learningPlan.js 中的 submitReflection 函数调用
        // 保留关闭按钮事件监听即可

        // 关闭弹窗按钮事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-feedback-btn')) {
                this.hideCompletionFeedback();
            }
        });
    }

    // 显示完成反馈弹窗
    showCompletionFeedback(reflection) {
        // 创建弹窗元素
        const feedbackOverlay = document.createElement('div');
        feedbackOverlay.className = 'completion-overlay';

        // 创建弹窗内容
        feedbackOverlay.innerHTML = `
            <div class="completion-feedback-modal">
                <div class="completion-celebration">
                    <div class="confetti-container" id="confetti-container"></div>
                    <div class="celebration-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h3 class="celebration-title">恭喜你完成了今日任务！</h3>
                    <p class="celebration-text">坚持学习是成功的关键，继续加油！</p>
                </div>
                
                <div class="reflection-display">
                    <h4>你的学习心得</h4>
                    <p class="reflection-content">${this.escapeHtml(reflection)}</p>
                </div>
                
                <div class="ai-feedback">
                    <h4><i class="fas fa-robot"></i> AI助手反馈</h4>
                    <div id="ai-feedback-content" class="ai-feedback-content">
                        <p class="ai-message">非常棒的总结！你已经很好地掌握了这个知识点。坚持这样的学习方法，相信你会取得更大的进步！</p>
                    </div>
                </div>
                
                <button class="close-feedback-btn">继续学习之旅</button>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(feedbackOverlay);

        // 启动五彩纸屑动画
        this.createConfetti();

        // 添加淡入动画类
        setTimeout(() => {
            feedbackOverlay.classList.add('active');
        }, 10);
    }

    // 隐藏完成反馈弹窗
    hideCompletionFeedback() {
        const overlay = document.querySelector('.completion-overlay');
        if (overlay) {
            // 添加淡出动画类
            overlay.classList.add('fade-out');

            // 动画结束后移除元素
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        }
    }

    // 创建五彩纸屑效果
    createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 创建多个五彩纸屑
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';

            // 随机位置、颜色和动画
            const left = Math.random() * 100;
            const width = Math.random() * 8 + 6;
            const height = Math.random() * 4 + 4;
            const colorIndex = Math.floor(Math.random() * this.confettiColors.length);
            const animationDuration = Math.random() * 3 + 2;
            const opacity = Math.random() * 0.3 + 0.7;

            confetti.style.left = `${left}%`;
            confetti.style.width = `${width}px`;
            confetti.style.height = `${height}px`;
            confetti.style.backgroundColor = this.confettiColors[colorIndex];
            confetti.style.animationDuration = `${animationDuration}s`;
            confetti.style.opacity = opacity;

            container.appendChild(confetti);
        }
    }

    // HTML转义函数，防止XSS
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 获取AI反馈
    async getAIFeedback(reflection, taskContent) {
        // 这里可以添加实际请求AI反馈的代码
        // 目前返回一个固定的反馈内容

        // 模拟加载延迟
        return new Promise((resolve) => {
            setTimeout(() => {
                // 随机选择一个激励性的反馈
                const feedbacks = [
                    "你的学习心得非常有深度！看得出你已经开始建立知识体系，并能够把新学的内容与已有知识结合起来。继续保持这种学习态度，你会越来越进步！",
                    "非常棒的总结！你已经很好地掌握了这个知识点，尤其是你的思考方式值得肯定。坚持这样的学习方法，相信你会取得更大的进步！",
                    "从你的心得中可以看出你对知识点有了深入的理解。持续这样的学习方式，你的学习效率会越来越高！",
                    "你的总结非常清晰，逻辑性很强。这种归纳整理的能力对学习非常重要，继续保持这个好习惯！",
                    "看得出你在学习过程中思考了很多，这种主动思考的态度对学习帮助很大。加油，你已经走在正确的道路上了！"
                ];
                const randomIndex = Math.floor(Math.random() * feedbacks.length);
                resolve(feedbacks[randomIndex]);
            }, 1500);
        });
    }
}

// 文档加载完成后初始化任务完成管理器
document.addEventListener('DOMContentLoaded', function () {
    // 添加CSS样式
    addTaskCompletionStyles();

    // 初始化任务完成管理器
    window.taskCompletionManager = new TaskCompletionManager();
});

// 添加所需CSS样式
function addTaskCompletionStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 遮罩层 */
        .completion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .completion-overlay.active {
            opacity: 1;
        }
        
        .completion-overlay.fade-out {
            opacity: 0;
        }

        /* 反馈窗口 */
        .completion-feedback-modal {
            width: 500px;
            max-width: 90%;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            overflow: hidden;
        }
        
        .completion-overlay.active .completion-feedback-modal {
            transform: translateY(0);
        }

        /* 庆祝部分 */
        .completion-celebration {
            text-align: center;
            margin-bottom: 25px;
            position: relative;
            overflow: hidden;
        }

        .celebration-icon {
            font-size: 64px;
            color: #FFD700;
            margin-bottom: 10px;
            animation: pulse 1.5s infinite;
        }

        .celebration-title {
            font-size: 24px;
            font-weight: 700;
            color: #4CAF50;
            margin-bottom: 5px;
        }

        .celebration-text {
            color: #555;
            font-size: 16px;
        }

        /* 心得展示区域 */
        .reflection-display {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .reflection-display h4 {
            color: #1e88e5;
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .reflection-content {
            color: #333;
            font-style: italic;
            line-height: 1.6;
        }

        /* AI反馈区域 */
        .ai-feedback {
            background-color: #EFF8FF;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }

        .ai-feedback h4 {
            color: #2196F3;
            display: flex;
            align-items: center;
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .ai-feedback h4 i {
            margin-right: 8px;
        }

        .ai-feedback-content {
            color: #333;
            line-height: 1.6;
        }

        .ai-message {
            position: relative;
            padding-left: 20px;
            margin: 0;
        }

        .ai-message:before {
            content: "";
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 80%;
            background-color: #2196F3;
            border-radius: 2px;
        }

        /* 加载动画 */
        .ai-feedback-loading {
            display: flex;
            justify-content: center;
            padding: 15px;
        }

        .dot-pulse {
            position: relative;
            left: -9999px;
            width: 6px;
            height: 6px;
            border-radius: 5px;
            background-color: #2196F3;
            color: #2196F3;
            box-shadow: 9999px 0 0 -5px;
            animation: dot-pulse 1.5s infinite linear;
            animation-delay: 0.25s;
        }

        .dot-pulse::before, .dot-pulse::after {
            content: "";
            display: inline-block;
            position: absolute;
            top: 0;
            width: 6px;
            height: 6px;
            border-radius: 5px;
            background-color: #2196F3;
            color: #2196F3;
        }

        .dot-pulse::before {
            box-shadow: 9984px 0 0 -5px;
            animation: dot-pulse-before 1.5s infinite linear;
            animation-delay: 0s;
        }

        .dot-pulse::after {
            box-shadow: 10014px 0 0 -5px;
            animation: dot-pulse-after 1.5s infinite linear;
            animation-delay: 0.5s;
        }

        @keyframes dot-pulse-before {
            0% { box-shadow: 9984px 0 0 -5px; }
            30% { box-shadow: 9984px 0 0 2px; }
            60%, 100% { box-shadow: 9984px 0 0 -5px; }
        }

        @keyframes dot-pulse {
            0% { box-shadow: 9999px 0 0 -5px; }
            30% { box-shadow: 9999px 0 0 2px; }
            60%, 100% { box-shadow: 9999px 0 0 -5px; }
        }

        @keyframes dot-pulse-after {
            0% { box-shadow: 10014px 0 0 -5px; }
            30% { box-shadow: 10014px 0 0 2px; }
            60%, 100% { box-shadow: 10014px 0 0 -5px; }
        }

        /* 关闭按钮 */
        .close-feedback-btn {
            display: block;
            width: 100%;
            padding: 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .close-feedback-btn:hover {
            background-color: #388E3C;
            transform: translateY(-2px);
            box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        }

        /* 五彩纸屑 */
        .confetti-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        }

        .confetti {
            position: absolute;
            width: 8px;
            height: 8px;
            top: -10px;
            transform-origin: center;
            animation: confettiFall linear forwards;
        }

        @keyframes confettiFall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(600px) rotate(360deg);
                opacity: 0;
            }
        }

        /* 动画效果 */
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}