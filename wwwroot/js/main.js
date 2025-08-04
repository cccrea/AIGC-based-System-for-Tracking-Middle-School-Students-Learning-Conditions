
//拆分coze传回的消息内容的函数
// 增强版流式回复处理，识别并提取follow_up类型消息

const enhancedStreamHandler = (function () {
    // 保存follow_up消息的数组
    let followUpMessages = [];
    let isWaitingForData = false;
    let currentMessageType = null;

    // 声明在处理器内部使用的updateQuickReplies函数
    function updateQuickRepliesInternal(suggestions) {
        const container = document.querySelector('.quick-replies-container');
        if (!container) {
            console.error("无法找到快速回复容器");
            return;
        }

        // 清空现有选项
        container.innerHTML = '';

        // 添加新的选项
        if (Array.isArray(suggestions) && suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const option = document.createElement('div');
                option.className = 'quick-reply-option';

                const span = document.createElement('span');
                span.textContent = suggestion;

                option.appendChild(span);
                container.appendChild(option);

                // 为新添加的选项绑定点击事件
                option.addEventListener('click', function () {
                    const replyText = this.querySelector('span').innerText;
                    const chatInput = document.getElementById('chat-input');
                    chatInput.value = replyText;
                    chatInput.focus();

                    // 添加点击反馈效果
                    this.style.backgroundColor = '#d0e3ff';
                    setTimeout(() => {
                        this.style.backgroundColor = '#f0f7ff';
                    }, 200);
                });
            });

            // 显示快速回复区域
            container.style.display = 'flex';
        } else {
            // 如果没有建议，隐藏快速回复区域或显示默认选项
            const defaultOptions = [
                "这个概念能再解释一下吗？",
                "能给我举个例子吗？",
                "有相关的学习资料推荐吗？"
            ];

            defaultOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'quick-reply-option';

                const span = document.createElement('span');
                span.textContent = option;

                optionDiv.appendChild(span);
                container.appendChild(optionDiv);

                // 绑定点击事件
                optionDiv.addEventListener('click', function () {
                    const replyText = this.querySelector('span').innerText;
                    const chatInput = document.getElementById('chat-input');
                    chatInput.value = replyText;
                    chatInput.focus();

                    this.style.backgroundColor = '#d0e3ff';
                    setTimeout(() => {
                        this.style.backgroundColor = '#f0f7ff';
                    }, 200);
                });
            });

            container.style.display = 'flex';
        }
    }

    function handleStreamResponse(line) {
        // 检查事件类型
        if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();

            // 特别关注follow_up类型的消息
            if (eventType === 'conversation.message.completed') {
                currentMessageType = 'checking_for_follow_up';
            } else if (eventType === 'done') {
                // 流结束，处理收集到的follow_up消息
                if (followUpMessages.length > 0) {
                    updateQuickRepliesInternal(followUpMessages);
                    console.log("已提取快速回复选项:", followUpMessages);
                    // 重置数组，为下一次对话准备
                    followUpMessages = [];
                }
                return 'stream_done';
            }

            return 'waiting_for_data';
        }

        if (line.startsWith('data:')) {
            try {
                const jsonStr = line.substring(5).trim();
                // 检查是否是[DONE]标记
                if (jsonStr === '"[DONE]"') {
                    return 'stream_done';
                }

                const jsonData = JSON.parse(jsonStr);

                // 检查是否是follow_up类型消息
                if (currentMessageType === 'checking_for_follow_up' &&
                    jsonData.type === 'follow_up' &&
                    jsonData.content) {
                    // 将follow_up消息添加到数组
                    followUpMessages.push(jsonData.content);
                }

                return jsonData;
            } catch (e) {
                console.error('JSON 解析错误:', e);
                return null;
            }
        }

        return null;
    }

    function onLineReceived(line) {
        if (isWaitingForData) {
            if (line.startsWith('data:')) {
                isWaitingForData = false;
                return handleStreamResponse(line);
            }
        } else {
            const result = handleStreamResponse(line);
            if (result === 'waiting_for_data') {
                isWaitingForData = true;
            } else if (result === 'stream_done') {
                // 重置状态
                isWaitingForData = false;
                currentMessageType = null;
            }
            return result;
        }
        return null;
    }

    // 清理状态，用于对话结束或切换会话时
    function reset() {
        followUpMessages = [];
        isWaitingForData = false;
        currentMessageType = null;
    }

    return {
        onLineReceived: onLineReceived,
        reset: reset,
        updateQuickReplies: updateQuickRepliesInternal
    };
})();


document.addEventListener('DOMContentLoaded', function () {
    // 初始化前先移除可能存在的事件监听器
    const questionArea = document.querySelector('.question-display-area');
    if (questionArea) {
        // 使用克隆节点的方式清除所有事件监听器
        const newQuestionArea = questionArea.cloneNode(true);
        questionArea.parentNode.replaceChild(newQuestionArea, questionArea);
    }
    // 初始化绑定状态编辑按钮事件
    bindStatusEditEvents();
    var tasks = {};
    var windowOptions = document.querySelector('.window-options');
    var children = windowOptions.children;
    var currentSubject = null;
    const sendBtn = document.getElementById("send-btn");
    const chatInput = document.getElementById("chat-input");
    // 获取修改理解状态相关的元素
    const editStatusBtn = document.getElementById('edit-status-btn');
    const saveStatusBtn = document.getElementById('save-status-btn');
    const cancelStatusBtn = document.getElementById('cancel-status-btn');
    const statusDisplay = document.getElementById('understanding-status-display');
    const statusEdit = document.getElementById('understanding-status-edit');
    // 获取确认问题按钮和问题输入框
    const confirmQuestionBtn = document.getElementById("confirm-question-btn");
    const questionInput = document.getElementById("question");
    // 添加这个变量来暂存当前操作的科目
    let currentOperatingSubject = null;
    // 添加变量存储检测到的知识点
    let detectedKnowledgePoints = [];
    // 获取空状态容器和聊天容器
    const emptyStateContainer = document.getElementById('empty-state-container');
    const chatContainer = document.getElementById('chat-container');
    // 初始状态判断 - 如果没有选中的任务，显示空状态
    function updateChatVisibility() {
        const selectedTask = document.querySelector('.task.selected');
        if (selectedTask) {
            // 有选中的任务，显示聊天界面
            emptyStateContainer.style.display = 'none';
            chatContainer.style.display = 'flex';
            chatContainer.style.flexDirection = 'column';
        } else {
            // 没有选中的任务，显示空状态
            emptyStateContainer.style.display = 'block';
            chatContainer.style.display = 'none';
        }
    }
    // 在页面加载时调用一次
    updateChatVisibility();
    // 初始化任务并为现有元素添加事件监听
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.classList.contains('option')) {
            currentSubject = child.querySelector('span').innerText;
            tasks[currentSubject] = [];

            // 为“+”按钮添加事件监听
            var addBtn = child.querySelector('.add-task-btn');
            if (addBtn) {
                addBtn.addEventListener('click', function () {
                    var subjectDiv = this.parentElement;
                    var subjectName = subjectDiv.querySelector('span').innerText;                  
                    // 修改这里，显示创建会话弹窗而不是直接添加任务
                    showCreateConversationModal(subjectName);
                });
            }
        } else if (child.classList.contains('task')) {
            // 对于现有的任务，添加到任务列表并添加事件监听
            var subjectName = getSubjectName(child);
            if (subjectName) {
                if (!tasks[subjectName]) {
                    tasks[subjectName] = [];
                }
                tasks[subjectName].push(child);

                // 添加事件监听
                addTaskEventListeners(child);
            }
        }
    }
    // 新建会话弹窗相关逻辑
    const createConversationModal = document.getElementById('create-conversation-modal');
    const closeCreateModalBtn = createConversationModal.querySelector('.close-modal-btn');
    const detectKnowledgeBtn = document.getElementById('detect-knowledge-btn');
    const createConversationBtn = document.getElementById('create-conversation-btn');
    const newQuestionInput = document.getElementById('new-question');
    const newConversationTitleInput = document.getElementById('new-conversation-title');
    // 编辑按钮点击事件
    if (editStatusBtn) {
        editStatusBtn.addEventListener('click', function () {
            statusDisplay.style.display = 'none';
            statusEdit.style.display = 'flex';
        });
    }

    // 取消按钮点击事件
    if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', function () {
            statusDisplay.style.display = 'flex';
            statusEdit.style.display = 'none';
        });
    }

    // 保存按钮点击事件
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', function () {
            const newStatus = document.getElementById('understanding-status-select').value;
            const conversationId = getCurrentConversationId();

            if (!conversationId) {
                showNotification('未选择会话', 'error');
                return;
            }

            // 发送请求更新理解状态
            updateUnderstandingStatus(conversationId, newStatus)
                .then(function () {
                    // 更新显示
                    displayUnderstandingStatus(newStatus);

                    // 切换回显示模式
                    statusDisplay.style.display = 'flex';
                    statusEdit.style.display = 'none';

                    // 显示成功提示
                    showNotification('理解状态已更新', 'success');
                })
                .catch(function (error) {
                    console.error('更新理解状态失败:', error);
                    showNotification('更新理解状态失败', 'error');
                });
        });
    }
    // 处理"心语"选项点击事件
    const xinYuOption = document.querySelector('.ai-chat-option');
    if (xinYuOption) {
        xinYuOption.addEventListener('click', function () {
            // 设置为心理咨询模式
            isInCounselorMode = true;
            // 显示聊天界面
            emptyStateContainer.style.display = 'none';
            chatContainer.style.display = 'flex';
            chatContainer.style.flexDirection = 'column';

            // 清空当前聊天内容
            const chatContent = document.querySelector('.chat-content');
            chatContent.innerHTML = '';

            // 更新聊天标题
            const chatTitle = document.querySelector('.chat-header h3');
            chatTitle.innerText = "AI心理咨询";

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

    // 显示新建会话弹窗
    function showCreateConversationModal(subjectName) {
        currentOperatingSubject = subjectName;
        newQuestionInput.value = '';
        newConversationTitleInput.value = '';

        // 弹窗中的知识点结果区域ID是'modal-knowledge-points-result'
        const modalKnowledgePointsResult = document.getElementById('modal-knowledge-points-result');
        if (modalKnowledgePointsResult) {
            modalKnowledgePointsResult.style.display = 'none';
        }

        // 清空弹窗中的知识点列表
        const modalKnowledgePointsList = document.getElementById('modal-knowledge-points-list');
        if (modalKnowledgePointsList) {
            modalKnowledgePointsList.innerHTML = '';
        }

        // 重置检测到的知识点
        detectedKnowledgePoints = [];

        // 显示弹窗
        createConversationModal.style.display = 'block';
    }

    // 关闭弹窗按钮点击事件
    closeCreateModalBtn.addEventListener('click', function () {
        createConversationModal.style.display = 'none';
    });

    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', function (event) {
        if (event.target === createConversationModal) {
            createConversationModal.style.display = 'none';
        }
    });
    // 检测知识点按钮点击事件
    detectKnowledgeBtn.addEventListener('click', async function () {
        const question = newQuestionInput.value.trim();

        if (!question) {
            showNotification('请输入问题内容', 'error');
            return;
        }

        try {
            // 修改按钮文本和禁用状态表示正在加载
            detectKnowledgeBtn.textContent = '检测中...';
            detectKnowledgeBtn.disabled = true;

            // 获取学生账号
            const studentAccount = document.getElementById('student-account').innerText.trim();

            // 发送请求直接检测知识点
            const response = await fetch('/Conversation/DetectKnowledgePointsDirectly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Question: question,
                    StudentAccount: studentAccount,
                    Subject: currentOperatingSubject
                })
            });

            const result = await response.json();
            console.log("知识点检测结果:", result); // 添加调试日志

            if (result.code === 0) {
                // 在知识点检测函数中使用新ID
                const knowledgePointsResult = document.getElementById('modal-knowledge-points-result');
                const knowledgePointsList = document.getElementById('modal-knowledge-points-list');
                // 确保结果区域显示
                knowledgePointsResult.style.display = 'block';

                // 清空现有内容
                knowledgePointsList.innerHTML = '';
                console.log("清空后的列表:", knowledgePointsList.innerHTML);
                // 检查知识点数据
                if (result.data && result.data.length > 0) {
                    detectedKnowledgePoints = result.data;
                    console.log("检测到的知识点:", detectedKnowledgePoints); // 添加调试日志

                    // 逐个添加每个知识点并立即检查DOM是否更新
                    for (let i = 0; i < result.data.length; i++) {
                        const point = result.data[i];
                        console.log(`添加知识点 ${i}: ${point}`);

                        const pointItem = document.createElement('span');
                        pointItem.className = 'knowledge-point-item';
                        pointItem.textContent = point;
                        pointItem.style.cssText = 'background-color: #e3f2fd; color: #1565c0; padding: 5px 10px; border-radius: 16px; font-size: 13px; display: inline-block; margin: 2px;';

                        knowledgePointsList.appendChild(pointItem);
                        console.log(`添加知识点 ${i} 后的列表:`, knowledgePointsList.innerHTML);
                    }

                    // 自动生成标题建议
                    if (!newConversationTitleInput.value) {
                        newConversationTitleInput.value = `关于${result.data[0]}的讨论`;
                    }
                } else {
                    // 如果没有检测到知识点，显示提示信息
                    const noPointsMsg = document.createElement('div');
                    noPointsMsg.textContent = '未检测到相关知识点';
                    noPointsMsg.style.color = '#666';
                    noPointsMsg.style.fontStyle = 'italic';
                    knowledgePointsList.appendChild(noPointsMsg);
                }
            } else {
                showNotification('知识点检测失败: ' + (result.msg || '未知错误'), 'error');
                console.error('知识点检测失败:', result);
            }
        } catch (error) {
            console.error('检测知识点失败:', error);
            showNotification('检测知识点失败，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            detectKnowledgeBtn.textContent = '检测知识点';
            detectKnowledgeBtn.disabled = false;
        }
    });
   
    // 创建会话按钮点击事件
    createConversationBtn.addEventListener('click', async function () {
        const question = newQuestionInput.value.trim();
        const title = newConversationTitleInput.value.trim();

        if (!question) {
            showNotification('请输入问题内容', 'error');
            return;
        }

        if (!title) {
            showNotification('请输入会话标题', 'error');
            return;
        }

        try {
            // 修改按钮文本和禁用状态表示正在加载
            createConversationBtn.textContent = '创建中...';
            createConversationBtn.disabled = true;

            // 获取学生账号
            const studentAccount = document.getElementById('student-account').innerText.trim();

            // 创建会话
            const createdData = await createConversationWithKnowledgePoints(
                studentAccount,
                currentOperatingSubject,
                title,
                detectedKnowledgePoints,
                question
            );

            // 创建新的任务元素 - 正确传递创建时间
            const newTaskDiv = createTaskElement(
                createdData.conversationId,
                title,
                createdData.createdTime  // 从返回的数据中获取创建时间
            );
            // 添加事件监听
            addTaskEventListeners(newTaskDiv);

            // 将新任务插入到对应科目下的任务列表中
            const subjectDiv = findSubjectDiv(currentOperatingSubject);
            let insertAfter = subjectDiv;
            while (insertAfter.nextElementSibling && insertAfter.nextElementSibling.classList.contains('task')) {
                insertAfter = insertAfter.nextElementSibling;
            }
            insertAfter.parentNode.insertBefore(newTaskDiv, insertAfter.nextElementSibling);

            // 添加到任务数组中
            tasks[currentOperatingSubject].push(newTaskDiv);

            // 关闭弹窗
            createConversationModal.style.display = 'none';

            // 显示创建成功的提示
            showNotification('会话创建成功', 'success');

            // 修改这里：直接更新右侧显示区域
            // 1. 选中新创建的任务
            const taskSpan = newTaskDiv.querySelector('span');

            // 2. 移除之前选中的任务的样式
            var previouslySelected = document.querySelector('.task.selected');
            if (previouslySelected) {
                previouslySelected.classList.remove('selected');
            }

            // 3. 为当前任务添加选中样式
            newTaskDiv.classList.add('selected');

            // 4. 更新标题
            const chatTitle = document.querySelector('.chat-header h3');
            chatTitle.innerText = title;

            // 5. 直接更新问题显示区域
            const questionTitle = document.getElementById('question-title');
            questionTitle.textContent = question;

            // 6. 更新知识点显示
            const knowledgePointsContainer = document.getElementById('knowledge-points-container');
            const knowledgePointsList = document.getElementById('knowledge-points-list');

            knowledgePointsList.innerHTML = '';

            if (detectedKnowledgePoints && detectedKnowledgePoints.length > 0) {
                // 显示知识点容器
                knowledgePointsContainer.style.display = 'block';

                // 添加每个知识点
                detectedKnowledgePoints.forEach(point => {
                    const pointItem = document.createElement('span');
                    pointItem.className = 'knowledge-point-item';
                    pointItem.textContent = point;
                    knowledgePointsList.appendChild(pointItem);
                });
            } else {
                // 如果没有知识点，隐藏容器
                knowledgePointsContainer.style.display = 'none';
            }
            // 7. 显示创建时间和理解状态
            // 默认显示当前时间为创建时间
            displayCreationTime(new Date());
            // 默认显示"正在学习中"状态
            displayUnderstandingStatus("正在学习中");
            // 8. 清空聊天内容区域
            const chatContent = document.querySelector('.chat-content');
            chatContent.innerHTML = '';

            // 9. 添加首条用户问题消息
            appendMessage(question, "user-message");

            // 10. 开始AI回答
            await startListeningForMessages(createdData.conversationId, question);

        } catch (error) {
            console.error('创建会话失败:', error);
            showNotification('会话创建失败，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            createConversationBtn.textContent = '创建会话';
            createConversationBtn.disabled = false;
            updateChatVisibility();
        }
    });
    // 创建带有知识点的会话
    function createConversationWithKnowledgePoints(studentAccount, subject, title, knowledgePoints, initialQuestion) {
        return new Promise(function (resolve, reject) {
            const apiUrl = '/Conversation/CreateWithKnowledgePoints';

            const requestData = {
                StudentAccount: studentAccount,
                Subject: subject,
                Title: title,
                KnowledgePoints: knowledgePoints,
                InitialQuestion: initialQuestion
            };

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            reject(errorData.msg || '未知错误');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.code === 0) {
                        resolve({
                            conversationId: data.data.conversation_id,
                            title: data.data.title,
                            createdTime: data.data.created_time,
                            understandingStatus: data.data.understanding_status
                        });
                    } else {
                        reject(data.msg || '未知错误');
                    }
                })
                .catch(error => {
                    console.error('Error in createConversationWithKnowledgePoints:', error);
                    reject(error);
                });
        });
    }

    // 修复createTaskElement函数中的错误
    function createTaskElement(conversationId, title, createdTime = null) {
        const newTaskDiv = document.createElement('div');
        newTaskDiv.className = 'task';
        newTaskDiv.dataset.conversationId = conversationId;

        // 创建任务内容容器
        const taskContentDiv = document.createElement('div');
        taskContentDiv.className = 'task-content';

        const taskSpan = document.createElement('span');
        taskSpan.innerText = title;
        taskContentDiv.appendChild(taskSpan);

        // 如果有创建时间，添加时间信息（小字体显示）
        if (createdTime) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'task-time';

            // 格式化日期为 YYYY-MM-DD
            const date = new Date(createdTime);
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            timeSpan.innerText = formattedDate;
            taskContentDiv.appendChild(timeSpan);
        }

        // 创建按钮容器
        const taskButtonsDiv = document.createElement('div');
        taskButtonsDiv.className = 'task-buttons';

        // 创建编辑按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerText = '✎';

        // 创建关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerText = '⦸';

        // 将按钮添加到按钮容器
        taskButtonsDiv.appendChild(editBtn);
        taskButtonsDiv.appendChild(closeBtn);

        // 将任务内容和按钮容器添加到任务元素
        newTaskDiv.appendChild(taskContentDiv);
        newTaskDiv.appendChild(taskButtonsDiv);

        return newTaskDiv;
    }
    // 查找科目元素的辅助函数
    function findSubjectDiv(subjectName) {
        const options = document.querySelectorAll('.option');
        for (let i = 0; i < options.length; i++) {
            const span = options[i].querySelector('span');
            if (span && span.innerText === subjectName) {
                return options[i];
            }
        }
        return null;
    }

    

    // 添加保存人类消息的函数（如果不存在）
    // 保存消息到数据库的函数
    async function saveChatMessage(conversationId, message, userType) {
        try {
            // 确定用户ID，如果是AI则设为"AI"，否则获取学生账号
            const userId = userType === 'AI' ? 'AI' :
                document.getElementById('student-account').innerText.trim();

            const response = await fetch("/Chat/SaveChatMessage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: message,
                    user_id: userId,
                    conversation_id: conversationId
                })
            });

            if (!response.ok) {
                throw new Error("Failed to save chat message");
            }

            const data = await response.json();
            console.log("Message saved successfully:", data);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    }
    // 初始化快速回复区域的事件处理
    document.addEventListener('DOMContentLoaded', function () {
        // 为现有的快速回复选项添加点击事件
        const quickReplyOptions = document.querySelectorAll('.quick-reply-option');

        quickReplyOptions.forEach(option => {
            option.addEventListener('click', function () {
                const replyText = this.querySelector('span').innerText;
                const chatInput = document.getElementById('chat-input');
                chatInput.value = replyText;
                chatInput.focus();

                this.style.backgroundColor = '#d0e3ff';
                setTimeout(() => {
                    this.style.backgroundColor = '#f0f7ff';
                }, 200);
            });
        });
    });
    // 添加发送按钮的点击事件、
    const originalSendBtnListener = sendBtn.onclick;
    sendBtn.onclick = null;
    sendBtn.addEventListener("click", async function () {
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, "user-message");
        chatInput.value = "";
        // 获取会话ID
        const conversationId = getCurrentConversationId();
        // 保存人类消息到数据库
        if (conversationId) {
            const studentAccount = document.getElementById('student-account').innerText.trim();
            await saveChatMessage(conversationId, message, studentAccount);
        }
        // 检查是否在心语会话中
        if (document.querySelector('.ai-chat-option.selected-option')) {
            // 发送到心理咨询师机器人
            await sendToCounselorBot(message);
        } else {
            // 常规学科聊天，使用现有的逻辑
            const conversationId = getCurrentConversationId();
            if (conversationId) {
                await startListeningForMessages(conversationId, message);
            } else {
                console.error("未选择会话");
                showNotification("请先选择一个会话", "error");
            }
        }
    });
    // 添加发送到心理咨询师机器人的函数
    async function sendToCounselorBot(message) {
        const messageDiv = document.createElement("div");
        const messageP = document.createElement("p");
        messageDiv.className = "message ai-message";
        messageDiv.appendChild(messageP);

        const chatContent = document.querySelector(".chat-content");
        chatContent.appendChild(messageDiv);

        let fullTxt = '';

        // 使用 EventSource 连接到后端
        const studentAccount = document.getElementById('student-account').innerText.trim();
        const eventSource = new EventSource(`/Chat/GetCounselorResponse?msg=${encodeURIComponent(message)}&studentAccount=${studentAccount}`);

        eventSource.onmessage = async (event) => {
            try {
                const data = event.data;
                const parsed = streamHandler.onLineReceived(data);

                if (parsed && parsed.role === 'assistant' &&
                    parsed.type === 'answer' &&
                    typeof parsed.content === 'string') {

                    fullTxt = fullTxt + parsed.content;
                }

                if (event.data.includes('[DONE]')) {
                    eventSource.close();
                    await typeWriterEffect(messageP, fullTxt, 10);
                    // 不需要保存聊天记录，因为这是临时的心理咨询会话
                }
            } catch (err) {
                console.error("解析消息错误:", err);
            }
        };

        eventSource.onerror = function (event) {
            console.error('EventSource连接错误:', event);
            eventSource.close();
        };
    }
    


    // 添加输入框的键盘事件
    chatInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault(); // 防止默认的提交行为
            sendBtn.click(); // 触发发送按钮点击事件
        }
    });
    ////获取会话ID的函数
    //function getCurrentConversationId() {
    //    const selectedTask = document.querySelector(".task.selected");
    //    return selectedTask ? selectedTask.dataset.conversationId : null;
    //}

     //创建会话的函数
    function createConversation(studentAccount, subjectName, title) {
        return new Promise(function (resolve, reject) {
            var apiUrl = '/Conversation/Create'; // 后端API的URL

            var requestData = {
                StudentAccount: studentAccount,
                Subject: subjectName,
                Title: title
            };

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
                .then(function (response) {
                    if (!response.ok) {
                        // 读取错误信息
                        return response.json().then(function (errorData) {
                            reject(errorData.msg || '未知错误');
                        });
                    }
                    return response.json();
                })
                .then(function (data) {
                    if (data.code === 0) {
                        // 会话创建成功，返回会话ID
                        resolve(data.data.Conversation_id);
                    } else {
                        // 会话创建失败
                        reject(data.msg || '未知错误');
                    }
                })
                .catch(function (error) {
                    console.error('Error in createConversation:', error);
                    reject(error);
                });
        });
    }



    // 显示通知的函数
    function showNotification(message, type) {
        var chatContent = document.querySelector('.chat-content');

        var notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification';

        // 根据类型设置样式
        if (type === 'success') {
            notificationDiv.style.backgroundColor = '#D0F0FD'; // 淡蓝色
            notificationDiv.style.color = '#007BFF'; // 深蓝色
        } else if (type === 'error') {
            notificationDiv.style.backgroundColor = '#FDD0D0'; // 淡红色
            notificationDiv.style.color = '#FF0000'; // 红色
        }

        notificationDiv.innerText = message;

        // 将通知添加到聊天内容区域的中间
        notificationDiv.style.position = 'absolute';
        notificationDiv.style.top = '50%';
        notificationDiv.style.left = '50%';
        notificationDiv.style.transform = 'translate(-50%, -50%)';
        notificationDiv.style.padding = '10px 20px';
        notificationDiv.style.borderRadius = '5px';
        notificationDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        notificationDiv.style.zIndex = '1000';

        chatContent.appendChild(notificationDiv);

        // 3秒后自动移除通知
        setTimeout(function () {
            chatContent.removeChild(notificationDiv);
        }, 3000);
    }

    // 为任务元素添加事件监听的函数
    function addTaskEventListeners(taskDiv) {
        var closeBtn = taskDiv.querySelector('.close-btn');
        var editBtn = taskDiv.querySelector('.edit-btn');
        var taskSpan = taskDiv.querySelector('span');
        var chatTitle = document.querySelector('.chat-header h3');
        chatTitle.innerText = taskSpan.innerText;

        // 关闭按钮事件
        closeBtn.addEventListener('click', function () {
            var conversationId = taskDiv.dataset.conversationId;
            deleteConversation(conversationId).then(function () {
                var subjectName = getSubjectName(taskDiv);
                var taskArray = tasks[subjectName];
                var indexInArray = taskArray.indexOf(taskDiv);
                if (indexInArray > -1) {
                    taskArray.splice(indexInArray, 1);
                }
                taskDiv.remove();
            }).catch(function (error) {
                console.error('删除会话失败:', error);
                showNotification('删除会话失败', 'error');
            });
        });

        // 编辑按钮事件
        editBtn.addEventListener('click', function () {
            var conversationId = taskDiv.dataset.conversationId;
            var originalTitle = taskSpan.innerText;

            // 显示弹窗
            showEditModal(conversationId, taskDiv, originalTitle);
        });
        //任务点击颜色加深，加载聊天记录,加载知识点
        let isInCounselorMode = false;
        taskSpan.addEventListener("click", function () {
            // 退出心理咨询模式
            isInCounselorMode = false;
            // 取消选中AI心理咨询选项
            const xinYuOption = document.querySelector('.ai-chat-option');
            if (xinYuOption) {
                xinYuOption.classList.remove('selected-option');
            }
            // 重置问题显示区域，确保其不被隐私保障信息替代
            restoreQuestionArea();
            var chatTitle = document.querySelector('.chat-header h3');
            chatTitle.innerText = taskSpan.innerText;

            // 移除之前选中的任务的样式
            var previouslySelected = document.querySelector('.task.selected');
            if (previouslySelected) {
                previouslySelected.classList.remove('selected');
            }

            // 为当前任务添加选中样式
            taskDiv.classList.add('selected');


            // 获取当前任务的 conversationId
            const conversationId = taskDiv.dataset.conversationId;

            // 如果 conversationId 存在，加载聊天记录
            if (conversationId) {
                loadChatMessages(conversationId);  // 加载聊天记录

                // 加载会话信息（题目和知识点）
                loadConversationInfo(conversationId);
            } else {
                console.error("No conversation ID found.");
            }
            updateChatVisibility();
        });


        // 添加加载会话信息的函数
        function loadConversationInfo(conversationId) {
            fetch(`/Conversation/GetConversationInfo?conversationId=${conversationId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.code === 0 && result.data) {
                        // 更新问题标题
                        const questionTitle = document.getElementById('question-title');
                        if (questionTitle) {
                            if (result.data.initialQuestion) {
                                questionTitle.textContent = result.data.initialQuestion;
                            } else {
                                questionTitle.textContent = "无初始问题";
                            }
                        }

                        // 更新知识点
                        const knowledgePointsContainer = document.getElementById('knowledge-points-container');
                        const knowledgePointsList = document.getElementById('knowledge-points-list');

                        if (knowledgePointsContainer && knowledgePointsList) {
                            knowledgePointsList.innerHTML = '';

                            if (result.data.knowledgePoints && result.data.knowledgePoints.length > 0) {
                                // 显示知识点容器
                                knowledgePointsContainer.style.display = 'block';

                                // 添加每个知识点
                                result.data.knowledgePoints.forEach(point => {
                                    const pointItem = document.createElement('span');
                                    pointItem.className = 'knowledge-point-item';
                                    pointItem.textContent = point;
                                    knowledgePointsList.appendChild(pointItem);
                                });
                            } else {
                                // 如果没有知识点，隐藏容器
                                knowledgePointsContainer.style.display = 'none';
                            }
                        }

                        // 更新创建时间
                        if (result.data.createdTime) {
                            displayCreationTime(result.data.createdTime);
                        }

                        // 更新理解状态
                        if (result.data.understandingStatus) {
                            displayUnderstandingStatus(result.data.understandingStatus);
                        }
                        bindStatusEditEvents();

                    } else {
                        // 处理错误情况
                        const questionTitle = document.getElementById('question-title');
                        if (questionTitle) {
                            questionTitle.textContent = "无法加载会话信息";
                        }

                        // 隐藏其他信息容器
                        const containers = [
                            'knowledge-points-container',
                            'understanding-status-container',
                            'creation-time-container'
                        ];

                        containers.forEach(id => {
                            const elem = document.getElementById(id);
                            if (elem) {
                                elem.style.display = 'none';
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error("Error loading conversation info:", error);

                    const questionTitle = document.getElementById('question-title');
                    if (questionTitle) {
                        questionTitle.textContent = "加载会话信息失败";
                    }

                    // 隐藏其他信息容器
                    const containers = [
                        'knowledge-points-container',
                        'understanding-status-container',
                        'creation-time-container'
                    ];

                    containers.forEach(id => {
                        const elem = document.getElementById(id);
                        if (elem) {
                            elem.style.display = 'none';
                        }
                    });
                });
        }

        // 加载聊天记录的函数
        function loadChatMessages(conversationId) {
            // 清空当前聊天内容
            const chatContent = document.querySelector('.chat-content');
            chatContent.innerHTML = '';  // 清空聊天窗口

            // 获取聊天记录的 API URL
            const apiUrl = `/Chat/GetChatMessages?conversationId=${conversationId}`;

            // 向服务器请求聊天记录
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data && Array.isArray(data)) {
                        // 对数据按 Timestamp 字段排序（降序或升序）
                        data.sort((a, b) => {
                            const timestampA = new Date(a.timestamp);  // 转换时间戳为 Date 对象
                            const timestampB = new Date(b.timestamp);
                            return timestampA - timestampB;  // 升序排列，最新的消息在底部
                        });

                        // 遍历聊天记录并显示在聊天窗口
                        data.forEach(message => {
                            const messageDiv = document.createElement("div");

                            // 使用正确的字段访问 message 内容
                            messageDiv.className = `message ${message.messageType === 'human' ? 'user-message' : 'ai-message'}`;
                          let Elp=  document.createElement("p");
                            Elp.innerText = message.message;
                            //messageDiv.innerHTML = `<p>${message.message}</p>`; // message.message 访问实际的消息内容
                            messageDiv.appendChild(Elp);
                            chatContent.appendChild(messageDiv);
                        });

                        // 自动滚动到底部
                        chatContent.scrollTop = chatContent.scrollHeight;
                    } else {
                        console.error("Failed to load chat messages.");
                    }
                })
                .catch(error => {
                    console.error("Error fetching chat messages:", error);
                });

        }
    }


    // 获取任务所属科目的辅助函数
    function getSubjectName(taskDiv) {
        var previousElement = taskDiv.previousElementSibling;
        while (previousElement) {
            if (previousElement.classList.contains('option')) {
                return previousElement.querySelector('span').innerText;
            }
            previousElement = previousElement.previousElementSibling;
        }
        return null;
    }
    //删除会话函数
    function deleteConversation(conversationId) {
        return new Promise(function (resolve, reject) {
            var apiUrl = '/Conversation/Delete/' + conversationId;
            fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(function (response) {
                    if (!response.ok) {
                        return response.json().then(function (errorData) {
                            reject(errorData.msg || '未知错误');
                        });
                    }
                    showNotification('删除成功', 'success');
                    resolve();
                })
                .catch(function (error) {
                    console.error('Error in deleteConversation:', error);
                    reject(error);
                });
        });
    }
    //更新会话标题函数
    function updateConversationTitle(conversationId, newTitle) {
        return new Promise(function (resolve, reject) {
            var apiUrl = '/Conversation/UpdateTitle/' + conversationId;
            var requestData = {
                Title: newTitle
            };
            fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
                .then(function (response) {
                    if (!response.ok) {
                        return response.json().then(function (errorData) {
                            reject(errorData.msg || '未知错误');
                        });
                    }
                    resolve();
                })
                .catch(function (error) {
                    console.error('Error in updateConversationTitle:', error);
                    reject(error);
                });
        });
    }

    // 显示编辑弹窗
    // 点击完成按钮，保存新标题
    //saveTitleBtn.onclick = function saveTitleHandler() {
    //    var newTitle = newTitleInput.value.trim();
    //    if (newTitle && newTitle !== originalTitle) {
    //        updateConversationTitle(conversationId, newTitle).then(function () {
    //            // 更新任务标题
    //            var taskSpan = taskDiv.querySelector('span');
    //            taskSpan.innerText = newTitle;

    //            // 如果当前聊天窗口的标题是原始标题，更新它
    //            var chatTitle = document.querySelector('.chat-header h3');
    //            if (chatTitle.innerText === originalTitle) {
    //                chatTitle.innerText = newTitle;
    //            }

    //            // 关闭弹窗
    //            modal.style.display = 'none';

    //            // 显示成功提示
    //            showNotification('标题更新成功', 'success');

    //            // 移除事件监听器，防止重复
    //            saveTitleBtn.onclick = null;
    //        }).catch(function (error) {
    //            console.error('更新会话标题失败:', error);
    //            showNotification('更新会话标题失败', 'error');
    //        });
    //    } else {
    //        // 如果没有修改标题，直接关闭弹窗
    //        modal.style.display = 'none';

    //        // 移除事件监听器，防止重复
    //        saveTitleBtn.onclick = null;
    //    }
    //};
    // 显示编辑弹窗的函数
    function showEditModal(conversationId, taskDiv, originalTitle) {
        var modal = document.getElementById('edit-modal');
        var closeModalBtn = modal.querySelector('.close-modal-btn');
        var saveTitleBtn = modal.querySelector('#save-title-btn');
        var newTitleInput = modal.querySelector('#new-title-input');

        // 预填入原始标题
        newTitleInput.value = originalTitle;

        // 显示弹窗
        modal.style.display = 'block';

        // 点击关闭按钮或窗口外部，关闭弹窗
        closeModalBtn.onclick = function () {
            modal.style.display = 'none';
        };

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };

        // 点击完成按钮，保存新标题
        saveTitleBtn.onclick = function () {
            var newTitle = newTitleInput.value.trim();
            if (newTitle && newTitle !== originalTitle) {
                updateConversationTitle(conversationId, newTitle).then(function () {
                    // 更新任务标题
                    var taskSpan = taskDiv.querySelector('span');
                    taskSpan.innerText = newTitle;

                    // 如果当前聊天窗口的标题是原始标题，更新它
                    var chatTitle = document.querySelector('.chat-header h3');
                    if (chatTitle.innerText === originalTitle) {
                        chatTitle.innerText = newTitle;
                    }

                    // 关闭弹窗
                    modal.style.display = 'none';

                    // 显示成功提示
                    showNotification('标题更新成功', 'success');
                }).catch(function (error) {
                    console.error('更新会话标题失败:', error);
                    showNotification('更新会话标题失败', 'error');
                });
            } else {
                // 如果没有修改标题，直接关闭弹窗
                modal.style.display = 'none';
            }
        };
    }
    //发送消息到服务器函数
    function sendMessageToServer(message) {
        const conversationId = getCurrentConversationId();
        const userId = document.getElementById("student-account").innerText.trim();

        if (!conversationId || !userId) {
            console.error("Conversation ID or User ID is missing.");
            return;
        }

        const requestData = {
            message: message,
            conversation_id: conversationId,
            user_id: userId
        };

        fetch("/Chat/GetAIResponse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to connect to the server.");
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");

                let buffer = "";
                function processStream({ done, value }) {
                    if (done) {
                        console.log("Stream completed.");
                        return;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    console.log("Received chunk:", chunk); // 打印每次接收到的原始数据
                    buffer += chunk;

                    const lines = buffer.split("\n");
                    buffer = lines.pop(); // 留下未完整的数据

                    lines.forEach(line => {
                        if (line.startsWith("data:")) {
                            const jsonData = line.substring(5).trim();
                            console.log("Parsed JSON string:", jsonData); // 打印解析的 JSON 字符串
                            try {
                                const parsed = JSON.parse(jsonData);
                                console.log("Parsed JSON object:", parsed); // 打印解析的 JSON 对象

                                if (parsed.event === "conversation.message.delta" && parsed.data.content) {
                                    appendMessage(parsed.data.content, "ai-message");
                                }
                            } catch (error) {
                                console.error("Failed to parse JSON:", error);
                            }
                        }
                    });

                    return reader.read().then(processStream);
                }

                return reader.read().then(processStream);
            })
            .catch(error => {
                console.error("Error fetching the stream:", error);
            });
    }
    //显示消息函数
    function appendMessage(content, className) {
        const chatContent = document.querySelector(".chat-content");
        if (!chatContent) {
            console.error("Chat content container not found.");
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




    

    // 打字机相关变量
    let buffer = '';          // 用来暂存需要展示的文本
    let isTyping = false;     // 是否正在“打字”
    let typingInterval = null;
    const displayEl = document.getElementsByClassName('chat-content');
    // 用于从 buffer 中逐字显示的函数
    // 使用 Promise 封装 setTimeout
    function sleep(ms) {4
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // 打印队列中的下一个消息
    async function printNextMessage(messageQueue, el, speed) {
        // 如果队列非空，则从队列中取出消息并逐字打印
        //let fullMsg=''
        while (messageQueue.length > 0) {
            const content = messageQueue.shift();  // 取出队列中的第一个消息
            console.log(content);
            await typeWriterEffect(el, content, speed);  // 打字机效果逐字打印

            // 打印完一个消息后，继续打印下一个消息
        }
        isPrinting = false;  // 打印完成，重置标志
    }
    async function typeWriterEffect(el, text, speed = 10) {

       // let i = 0;
        // console.log("外面传进来的" + text);
        async function typing() {
            //  console.log('' text)

            for (i = 0; i < text.length; i++) {
                el.innerText += text.charAt(i);  // 显示当前字符
                await sleep(speed);  // 使用 await 确保每个字符逐步显示
              
            }
           

            //if (i < text.length) {
            //    el.textContent += text.charAt(i);
            //    i++;
            //    //setTimeout(typing, speed);
            //    await new Promise(typing => setTimeout(typing, ms));
            //} else {
            //    return;
            //}
        }
        typing();

    }


    let isPrinting = false;  // 用来控制是否在打字机效果

  
    let messageQueue = [];    // 消息队列，用于存储未打印的消息
    // 修改后的startListeningForMessages函数，使用增强版流处理器
    async function startListeningForMessages(conversationId, msg) {
        if (!conversationId) {
            console.error("No conversation ID available.");
            return;
        }

        // 重置流处理器状态
        enhancedStreamHandler.reset();

        const eventSource = new EventSource(`/Chat/GetAIResponse?conversationId=${conversationId}&msg=${encodeURIComponent(msg)}`);
        const chatContent = document.querySelector(".chat-content");

        // 创建AI消息元素
        const messageDiv = document.createElement("div");
        const messageP = document.createElement("p");
        messageDiv.className = "message ai-message";
        messageDiv.appendChild(messageP);
        chatContent.appendChild(messageDiv);

        let fullTxt = '';
     
        let completeResponseReceived = false;
        let completedCount = 0; 
        let skipNext = false;
        eventSource.onmessage = async (event) => {
            try {
                // 用于记录 data: event:conversation.message.completed 出现的次数
                const data = event.data;
                if (data.trim() === "") {
                    return; // 跳过空行
                }
                const parsed = enhancedStreamHandler.onLineReceived(data);
                // 检查是否是流结束的标志
                if (data.includes('[DONE]') || parsed === 'stream_done') {
                    eventSource.close();
                    // 确保显示最终完整的消息
                    messageP.innerText = fullTxt;
                    // 保存AI回复到聊天记录
                    saveChatMessage(conversationId, fullTxt, 'AI');
                    return;
                }
                // 检查是否是第二次出现 data: event:conversation.message.completed
                if (data.includes("event:conversation.message.completed")) {
                    completedCount++;
                    if (completedCount === 2) {
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
                if (parsed &&
                    parsed.role === 'assistant' &&
                    parsed.type === 'answer' &&
                    typeof parsed.content === 'string') {

                    // 添加内容到fullTxt
                    fullTxt += parsed.content;
                    // 实时更新显示内容
                    messageP.innerText = fullTxt;
                    // 自动滚动到底部
                    chatContent.scrollTop = chatContent.scrollHeight;
                }
            } catch (err) {
                console.error("解析消息错误:", err);
            }
        };

        eventSource.onerror = function (event) {
            console.error('EventSource连接错误:', event);
            eventSource.close();
        };
    }
    // 更新快速回复选项的函数
    function updateQuickReplies(suggestions) {
        const container = document.querySelector('.quick-replies-container');

        // 清空现有选项
        container.innerHTML = '';

        // 添加新的选项
        if (Array.isArray(suggestions) && suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const option = document.createElement('div');
                option.className = 'quick-reply-option';

                const span = document.createElement('span');
                span.textContent = suggestion;

                option.appendChild(span);
                container.appendChild(option);

                // 为新添加的选项绑定点击事件
                option.addEventListener('click', function () {
                    const replyText = this.querySelector('span').innerText;
                    const chatInput = document.getElementById('chat-input');
                    chatInput.value = replyText;
                    chatInput.focus();

                    // 添加点击反馈效果
                    this.style.backgroundColor = '#d0e3ff';
                    setTimeout(() => {
                        this.style.backgroundColor = '#f0f7ff';
                    }, 200);
                });
            });

            // 显示快速回复区域
            container.style.display = 'flex';
        } else {
            // 如果没有建议，隐藏快速回复区域或显示默认选项
            // 这里可以选择显示一些通用问题
            const defaultOptions = [
                "这个概念能再解释一下吗？",
                "能给我举个例子吗？",
                "有相关的学习资料推荐吗？"
            ];

            defaultOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'quick-reply-option';

                const span = document.createElement('span');
                span.textContent = option;

                optionDiv.appendChild(span);
                container.appendChild(optionDiv);

                // 绑定点击事件
                optionDiv.addEventListener('click', function () {
                    const replyText = this.querySelector('span').innerText;
                    const chatInput = document.getElementById('chat-input');
                    chatInput.value = replyText;
                    chatInput.focus();

                    this.style.backgroundColor = '#d0e3ff';
                    setTimeout(() => {
                        this.style.backgroundColor = '#f0f7ff';
                    }, 200);
                });
            });

            container.style.display = 'flex';
        }
    }
   
});
// 添加显示理解状态的函数
function displayUnderstandingStatus(status) {
    const statusElement = document.getElementById('understanding-status');
    const statusContainer = document.getElementById('understanding-status-container');

    if (!statusElement || !statusContainer) return;

    // 显示状态容器
    statusContainer.style.display = 'flex';

    // 根据状态设置样式和文本
    statusElement.textContent = status;

    // 移除所有现有样式类
    statusElement.classList.remove('status-good', 'status-learning', 'status-difficult');

    // 添加对应的样式类
    switch (status) {
        case '已透彻理解':
            statusElement.style.color = '#4caf50';
            break;
        case '正在学习中':
            statusElement.style.color = '#2196f3';
            break;
        case '难以理解':
            statusElement.style.color = '#f44336';
            break;
        default:
            statusElement.style.color = '#2196f3';
            break;
    }

    // 标记编辑面板中的当前选中状态
    const statusOptions = document.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
        if (option.dataset.value === status) {
            option.style.backgroundColor = '#f0f7ff';
        } else {
            option.style.backgroundColor = '';
        }
    });
}

// 更新显示创建时间的函数
function displayCreationTime(creationTime) {
    const timeElement = document.getElementById('creation-time');
    const timeContainer = document.getElementById('creation-time-container');

    if (!timeElement || !timeContainer) return;

    // 显示时间容器
    timeContainer.style.display = 'flex';

    // 格式化时间
    const date = new Date(creationTime);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // 设置时间文本
    timeElement.textContent = formattedDate;
}
// 添加更新理解状态的函数
function updateUnderstandingStatus(conversationId, status) {
    return new Promise(function (resolve, reject) {
        var apiUrl = `/Conversation/UpdateUnderstandingStatus/${conversationId}`;
        var requestData = {
            UnderstandingStatus: status
        };

        fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(function (response) {
                if (!response.ok) {
                    return response.json().then(function (errorData) {
                        reject(errorData.msg || '未知错误');
                    });
                }
                return response.json();
            })
            .then(function (data) {
                if (data.code === 0) {
                    resolve();
                } else {
                    reject(data.msg || '未知错误');
                }
            })
            .catch(function (error) {
                console.error('Error in updateUnderstandingStatus:', error);
                reject(error);
            });
    });
}
// 绑定状态编辑交互事件的函数
// 修改 bindStatusEditEvents 函数，使用事件委托方式
function bindStatusEditEvents() {
    // 获取问题显示区域作为父元素
    const questionArea = document.querySelector('.question-display-area');
    if (!questionArea) return;

    // 使用事件委托，监听整个问题区域的点击事件
    questionArea.addEventListener('click', function (e) {
        // 如果点击的是编辑按钮
        if (e.target.closest('#edit-status-btn')) {
            const statusDisplay = document.getElementById('understanding-status-display');
            const statusEdit = document.getElementById('understanding-status-edit');

            if (statusDisplay && statusEdit) {
                statusDisplay.style.display = 'none';
                statusEdit.style.display = 'block';
            }
            e.stopPropagation(); // 阻止事件冒泡
        }

        // 如果点击的是状态选项
        const statusOption = e.target.closest('.status-option');
        if (statusOption) {
            const newStatus = statusOption.dataset.value;
            const conversationId = getCurrentConversationId();

            if (!conversationId) {
                showNotification('未选择会话', 'error');
                return;
            }

            // 更新选中状态的视觉反馈
            document.querySelectorAll('.status-option').forEach(opt => {
                opt.style.backgroundColor = '';
            });
            statusOption.style.backgroundColor = '#f0f7ff';

            // 发送请求更新理解状态
            updateUnderstandingStatus(conversationId, newStatus)
                .then(function () {
                    // 更新显示
                    displayUnderstandingStatus(newStatus);

                    // 关闭编辑面板
                    const statusEdit = document.getElementById('understanding-status-edit');
                    if (statusEdit) statusEdit.style.display = 'none';

                    // 显示状态显示面板
                    const statusDisplay = document.getElementById('understanding-status-display');
                    if (statusDisplay) statusDisplay.style.display = 'flex';

                    // 显示成功提示
                    showNotification('理解状态已更新', 'success');
                })
                .catch(function (error) {
                    console.error('更新理解状态失败:', error);
                    showNotification('更新理解状态失败', 'error');
                });
        }
    });

    // 点击页面其他地方关闭编辑面板
    document.addEventListener('click', function (e) {
        const statusEdit = document.getElementById('understanding-status-edit');
        const editBtn = document.getElementById('edit-status-btn');

        if (statusEdit && statusEdit.style.display === 'block' &&
            !statusEdit.contains(e.target) &&
            !e.target.closest('#edit-status-btn')) {
            statusEdit.style.display = 'none';

            // 恢复状态显示面板
            const statusDisplay = document.getElementById('understanding-status-display');
            if (statusDisplay) statusDisplay.style.display = 'flex';
        }
    });
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
    bindStatusEditEvents();
}
// 获取当前选中的会话ID的函数
function getCurrentConversationId() {
    var selectedTask = document.querySelector('.task.selected');
    if (selectedTask) {
        return selectedTask.dataset.conversationId;
    } else {
        console.error('未选中任何会话');
        showNotification('未选中任何会话', 'error');
        return null;
    }
}