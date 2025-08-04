// AI心理咨询功能 - 使用完全相同的重复处理逻辑
document.addEventListener('DOMContentLoaded', function () {
    // 获取相关DOM元素
    const xinYuOption = document.querySelector('.ai-chat-option');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');

    // 标记是否处于心理咨询模式
    let isInCounselorMode = false;

    // 设置心理咨询选项样式
    if (xinYuOption && xinYuOption.querySelector('span')) {
        xinYuOption.querySelector('span').textContent = "AI心理咨询";
    }

    // 为心理咨询选项添加点击事件
    if (xinYuOption) {
        xinYuOption.addEventListener('click', function () {
            // 设置为心理咨询模式
            isInCounselorMode = true;
            console.log("已进入心理咨询模式");

            // 显示聊天界面
            const emptyStateContainer = document.getElementById('empty-state-container');
            const chatContainer = document.getElementById('chat-container');
            if (emptyStateContainer) emptyStateContainer.style.display = 'none';
            if (chatContainer) {
                chatContainer.style.display = 'flex';
                chatContainer.style.flexDirection = 'column';
            }

            // 清空当前聊天内容
            const chatContent = document.querySelector('.chat-content');
            if (chatContent) chatContent.innerHTML = '';

            // 更新聊天标题
            const chatTitle = document.querySelector('.chat-header h3');
            if (chatTitle) chatTitle.innerText = "AI心理咨询";

            // 更新问题标题为隐私保障提示
            const questionDisplayArea = document.querySelector('.question-display-area');
            if (questionDisplayArea) {
                questionDisplayArea.innerHTML = `
                    <div style="flex: 1; background-color: #e3f2fd; border-left: 4px solid #1565c0; padding: 15px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <i class="fas fa-shield-alt" style="color: #1565c0; font-size: 1.2em; margin-right: 10px;"></i>
                            <h4 style="margin: 0; color: #1565c0; font-weight: bold;">隐私保障</h4>
                        </div>
                        <p style="margin: 0; color: #333; line-height: 1.5;">
                            您与AI心理咨询师的对话内容严格保密，仅用于帮助您缓解压力和情绪困扰。
                            我们承诺不会泄露您的任何个人信息或对话内容，请放心分享您的感受和想法。
                        </p>
                    </div>
                `;
            }

            // 取消选中的任务
            const selectedTask = document.querySelector('.task.selected');
            if (selectedTask) {
                selectedTask.classList.remove('selected');
            }

            // 标记心语选项为已选中
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected-option');
            });
            xinYuOption.classList.add('selected-option');

            // 显示欢迎消息
            appendMessage(`
                你好，我是你的AI心理咨询师。我在这里是为了倾听和支持你。无论你想分享什么，
                都可以放心告诉我。今天你想聊些什么呢？你可以分享你的感受、困扰或者只是想
                聊聊天来放松一下。
            `, "ai-message");
        });
    }

    // 拦截发送按钮点击事件
    const originalSendBtnListener = sendBtn.onclick;
    sendBtn.onclick = null;

    sendBtn.addEventListener("click", function () {
        const message = chatInput.value.trim();
        if (!message) return;

        // 如果在心理咨询模式中，使用心理咨询处理
        if (isInCounselorMode) {
            // 显示用户消息
            appendMessage(message, "user-message");
            chatInput.value = "";

            // 处理心理咨询消息
            handleCounselorMessage(message);
        } else if (typeof originalSendBtnListener === 'function') {
            // 否则调用原始处理程序
            originalSendBtnListener.call(this);
        }
    });

    // 添加输入框的键盘事件
    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && isInCounselorMode) {
            e.preventDefault(); // 防止默认的提交行为
            sendBtn.click(); // 触发发送按钮点击事件
        }
    });

    // 为所有任务元素添加点击事件，退出心理咨询模式
    document.addEventListener('click', function (e) {
        const taskElement = e.target.closest('.task');
        if (taskElement) {
            // 退出心理咨询模式
            isInCounselorMode = false;

            // 取消选中AI心理咨询选项
            if (xinYuOption) {
                xinYuOption.classList.remove('selected-option');
            }

            // 恢复问题显示区域
            restoreQuestionArea();
        }
    });

    // 替换 counselor.js 中的 handleCounselorMessage 函数
    function handleCounselorMessage(message) {
        // 创建AI回复的消息元素
        const messageDiv = document.createElement("div");
        const messageP = document.createElement("p");
        messageDiv.className = "message ai-message";
        messageDiv.appendChild(messageP);

        const chatContent = document.querySelector(".chat-content");
        chatContent.appendChild(messageDiv);

        // 显示"正在思考"的提示
        messageP.innerText = "正在思考...";

        // 获取学生账号
        const studentAccount = document.getElementById('student-account').innerText.trim();

        // 使用 EventSource 连接到后端
        const eventSource = new EventSource(`/Chat/GetCounselorResponse?msg=${encodeURIComponent(message)}&studentAccount=${encodeURIComponent(studentAccount)}`);

        let fullTxt = '';
        let completedCount = 0;
        let skipNext = false;

        eventSource.onmessage = async (event) => {

            try {
                
                const data = event.data;
                console.log(data)
                if (data.trim() === "") {
                    return; // 跳过空行
                }

                // 检查是否是流结束的标志
                if (data.includes('[DONE]')) {
                    eventSource.close();
                    // 确保显示最终完整的消息
                    messageP.innerText = fullTxt;
                    return;
                }

                // 检查是否是第二次出现 data: event:conversation.message.completed
                if (data.includes("event:conversation.message.completed")) {
                    completedCount++;
                    if (completedCount === 1) {
                        // 标记下一次接收到的数据需要跳过
                        skipNext = true;
                        return;
                    }
                }

                // 如果需要跳过下一条数据，直接返回
                if (skipNext) {
                    skipNext = false;
                    return;
                }

                // 处理常规回答内容
                if (data.startsWith('data:')) {
                    try {
                        const jsonStr = data.substring(5).trim();
                        // 跳过特殊标记
                        if (!jsonStr || jsonStr === '"[DONE]"') return;

                        const jsonData = JSON.parse(jsonStr);

                        // 只处理助手回答类型的内容
                        if (jsonData &&
                            jsonData.role === 'assistant' &&
                            jsonData.type === 'answer' &&
                            typeof jsonData.content === 'string') {

                            // 清除"正在思考"提示文本
                            if (messageP.innerText === "正在思考...") {
                                messageP.innerText = '';
                            }

                            // 添加内容到fullTxt
                            fullTxt += jsonData.content;

                            // 实时更新显示内容
                            messageP.innerText = fullTxt;

                            // 自动滚动到底部
                            chatContent.scrollTop = chatContent.scrollHeight;
                        }
                    } catch (error) {
                        console.warn("JSON解析错误:", error, "原始数据:", data);
                    }
                }
            } catch (err) {
                console.error("解析消息错误:", err);
            }
        };

        eventSource.onerror = function (error) {
            console.error('EventSource连接错误:', error);
            eventSource.close();

            // 如果未收到任何内容，则显示错误消息
            if (fullTxt === '' || messageP.innerText === "正在思考...") {
                messageP.innerText = "抱歉，目前无法获取回复，请稍后再试。";
            }
        };
    }

    // 恢复问题区域的HTML结构（从心理咨询模式切换回来时）
    function restoreQuestionArea() {
        const questionDisplayArea = document.querySelector('.question-display-area');
        if (!questionDisplayArea) return;

        questionDisplayArea.innerHTML = `
            <!-- 左侧信息 -->
            <div class="question-left-panel">
                <!-- 问题标题 -->
                <div class="question-title-container">
                    <div class="info-header">问题</div>
                    <div id="question-title" class="question-title">加载中...</div>
                </div>
                
                <!-- 知识点显示 -->
                <div id="knowledge-points-container" class="knowledge-points-container" style="display: none;">
                    <div class="info-header">涉及知识点</div>
                    <div id="knowledge-points-list" class="knowledge-points-list"></div>
                </div>
            </div>
            
            <!-- 右侧信息 -->
            <div class="question-right-panel">
                <!-- 创建时间 -->
                <div id="creation-time-container" class="info-item" style="display: none;">
                    <i class="fas fa-calendar-alt info-icon"></i>
                    <span class="info-label">创建时间：</span>
                    <span id="creation-time" class="info-value"></span>
                </div>
                
                <!-- 理解状态 -->
                <div id="understanding-status-container" class="info-item" style="display: none;">
                    <i class="fas fa-brain info-icon"></i>
                    <span class="info-label">理解状态：</span>
                    <div id="understanding-status-display" class="status-display">
                        <span id="understanding-status" class="status-badge"></span>
                        <button id="edit-status-btn" class="edit-btn" title="点击修改理解状态">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                    <div id="understanding-status-edit" class="status-edit">
                        <div class="status-options">
                            <div class="status-option" data-value="已透彻理解">
                                <span class="status-dot status-good"></span>
                                <span class="status-text">已透彻理解</span>
                            </div>
                            <div class="status-option" data-value="正在学习中">
                                <span class="status-dot status-learning"></span>
                                <span class="status-text">正在学习中</span>
                            </div>
                            <div class="status-option" data-value="难以理解">
                                <span class="status-dot status-difficult"></span>
                                <span class="status-text">难以理解</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 重新绑定事件
        if (typeof window.bindStatusEditEvents === 'function') {
            window.bindStatusEditEvents();
        }
    }

    // 辅助函数：显示消息
    function appendMessage(content, className) {
        const chatContent = document.querySelector(".chat-content");
        if (!chatContent) {
            console.error("聊天内容容器未找到");
            return;
        }

        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${className}`;

        const messageP = document.createElement("p");
        messageP.textContent = content;
        messageDiv.appendChild(messageP);

        chatContent.appendChild(messageDiv);
        chatContent.scrollTop = chatContent.scrollHeight; // 自动滚动到底部
    }

    // 暴露心理咨询模式状态为全局变量
    window.isInCounselorMode = function () {
        return isInCounselorMode;
    };

    console.log("AI心理咨询功能已初始化 - 完全匹配main.js的重复处理逻辑");
});