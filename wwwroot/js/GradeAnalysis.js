// 定义全局变量
let currentTeacherAccount = '';
let currentGradeData = null;
let currentGradeChart = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    // 获取教师账号
    const urlParams = new URLSearchParams(window.location.search);
    currentTeacherAccount = urlParams.get('account');

    if (!currentTeacherAccount) {
        showAlert('error', '无法获取教师账号信息，部分功能可能无法正常使用');
    } else {
        // 加载成绩文件列表
        loadGradeFiles();
    }

    // 绑定上传按钮事件
    document.getElementById('submitGradeUpload').addEventListener('click', uploadGradeFile);

    // 绑定图表类型切换事件
    document.getElementById('chartType').addEventListener('change', updateChartType);

    // 绑定筛选选项改变事件
    document.getElementById('filterOptions').addEventListener('change', applyFilter);

    // 绑定排序按钮事件
    document.getElementById('sortNameBtn').addEventListener('click', () => sortGradeData('name'));
    document.getElementById('sortScoreBtn').addEventListener('click', () => sortGradeData('score'));

    // 绑定生成报告按钮事件
    document.getElementById('generateReportBtn').addEventListener('click', generateAnalysisReport);

    // 绑定导出报告按钮事件
    document.getElementById('exportReportBtn').addEventListener('click', exportAnalysisReport);
});

// 加载成绩文件列表
function loadGradeFiles() {
    fetch(`/Teachers/GetGradeFiles?account=${currentTeacherAccount}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('加载成绩文件列表失败');
            }
            return response.json();
        })
        .then(data => {
            const tableBody = document.querySelector('#gradeFileList tbody');

            // 移除加载中提示
            const emptyRow = document.getElementById('empty-grade-row');
            if (emptyRow) {
                emptyRow.remove();
            }

            if (data.length === 0) {
                // 没有文件时显示提示
                const noDataRow = document.createElement('tr');
                noDataRow.innerHTML = `
                    <td colspan="3" class="text-center py-4">
                        <i class="fas fa-info-circle text-muted me-2"></i> 暂无成绩文件，请点击"上传成绩数据"按钮添加
                    </td>
                `;
                tableBody.appendChild(noDataRow);
            } else {
                // 添加文件列表
                data.forEach(file => {
                    const row = document.createElement('tr');

                    // 格式化日期
                    const uploadDate = new Date(file.uploadDate);
                    const formattedDate = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}-${String(uploadDate.getDate()).padStart(2, '0')}`;

                    row.innerHTML = `
                        <td>
                            <a href="javascript:void(0)" class="view-grade-file text-decoration-none" data-url="${file.fileUrl}" data-id="${file.id}" data-name="${file.fileName}">
                                <i class="fas fa-file-excel text-success me-2"></i>${file.fileName}
                            </a>
                        </td>
                        <td>${formattedDate}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary view-grade-btn" data-url="${file.fileUrl}" data-id="${file.id}" data-name="${file.fileName}">
                                    <i class="fas fa-eye"></i> 查看分析
                                </button>
                                <button class="btn btn-outline-danger delete-grade-btn" data-id="${file.id}">
                                    <i class="fas fa-trash-alt"></i> 删除
                                </button>
                            </div>
                        </td>
                    `;

                    tableBody.appendChild(row);
                });

                // 绑定查看按钮事件
                // 修改查看按钮事件处理
                document.querySelectorAll('.view-grade-btn, .view-grade-file').forEach(btn => {
                    btn.addEventListener('click', function () {
                        const fileId = this.dataset.id;
                        const fileName = this.dataset.name;

                        // 显示加载中提示
                        showAlert('info', '正在加载成绩数据，请稍候...');

                        // 调用后端API获取文件内容
                        fetch(`/Teachers/AnalyzeGradeFile?fileId=${fileId}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('无法获取文件内容');
                                }
                                return response.json();
                            })
                            .then(data => {
                                // 将Base64编码的文件内容转换为二进制数组
                                const binaryString = window.atob(data.fileContent);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }

                                // 使用XLSX.js处理文件内容
                                processGradeFile(bytes.buffer, data.fileName);
                            })
                            .catch(error => {
                                console.error('加载成绩数据出错:', error);
                                showAlert('error', error.message || '加载成绩数据失败，请检查文件格式');
                            });
                    });
                });

                // 绑定删除按钮事件
                document.querySelectorAll('.delete-grade-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        const fileId = this.dataset.id;
                        showDeleteConfirmation(fileId);
                    });
                });
            }
        })
        .catch(error => {
            console.error('加载成绩文件列表出错:', error);
            showAlert('error', '加载成绩文件列表失败，请刷新页面重试');
        });
}
// 添加处理文件内容的函数
function processGradeFile(arrayBuffer, fileName) {
    try {
        // 使用XLSX.js解析Excel文件
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        // 验证数据格式
        if (data.length === 0) {
            throw new Error('成绩数据为空');
        }

        // 尝试识别列名
        const firstRow = data[0];
        const nameKey = Object.keys(firstRow).find(key =>
            ['姓名', '学生姓名', '学生', 'name', '名字'].some(nameStr =>
                key.toLowerCase().includes(nameStr.toLowerCase())
            )
        );

        const scoreKey = Object.keys(firstRow).find(key =>
            ['成绩', '分数', '得分', 'score', '考试成绩'].some(scoreStr =>
                key.toLowerCase().includes(scoreStr.toLowerCase())
            )
        );

        if (!nameKey || !scoreKey) {
            throw new Error('无法识别姓名或成绩列，请确保Excel文件包含"姓名"和"成绩"两列');
        }

        // 处理并规范化数据
        const gradeData = data.map(row => {
            const score = parseFloat(row[scoreKey]);
            return {
                name: row[nameKey],
                score: isNaN(score) ? 0 : score
            };
        });

        // 保存当前数据
        currentGradeData = gradeData;

        // 更新页面显示
        displayGradeData(gradeData, fileName);

        // 创建图表
        createGradeChart(gradeData);

        // 显示分析报告区域
        document.getElementById('analysisReportCard').style.display = 'block';

        // 自动生成分析报告
        generateAnalysisReport();

    } catch (error) {
        console.error('处理成绩数据出错:', error);
        showAlert('error', error.message || '处理成绩数据失败，请检查文件格式');
    }
}
// 上传成绩文件
function uploadGradeFile() {
    const fileName = document.getElementById('gradeFileName').value.trim();
    const fileInput = document.getElementById('gradeFileInput');

    if (!fileName) {
        showAlert('warning', '请输入文件名称');
        return;
    }

    if (!fileInput.files[0]) {
        showAlert('warning', '请选择要上传的文件');
        return;
    }

    // 检查文件类型
    const fileExtension = fileInput.files[0].name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        showAlert('warning', '只支持Excel格式的文件(.xlsx, .xls)');
        return;
    }

    // 显示上传中状态
    const submitBtn = document.getElementById('submitGradeUpload');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> 上传中...';
    submitBtn.disabled = true;

    // 创建FormData对象
    const formData = new FormData();
    formData.append('fileName', fileName);
    formData.append('file', fileInput.files[0]);
    formData.append('teacherAccount', currentTeacherAccount);

    // 发送上传请求
    fetch('/Teachers/UploadGradeFile', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('上传失败');
            }
            return response.json();
        })
        .then(data => {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadGradeModal'));
            modal.hide();

            // 清空表单
            document.getElementById('gradeFileName').value = '';
            document.getElementById('gradeFileInput').value = '';

            // 重新加载文件列表
            loadGradeFiles();

            // 显示上传成功消息
            showAlert('success', '成绩文件上传成功');

            // 自动加载上传的文件数据进行分析
            loadGradeDataFromUrl(data.fileUrl, fileName);
        })
        .catch(error => {
            console.error('上传成绩文件出错:', error);
            showAlert('error', '上传成绩文件失败，请稍后重试');
        })
        .finally(() => {
            // 恢复按钮状态
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
}

// 显示删除确认对话框
function showDeleteConfirmation(fileId) {
    const modal = new bootstrap.Modal(document.getElementById('deleteGradeFileModal'));
    modal.show();

    // 绑定确认删除按钮事件
    document.getElementById('confirmDeleteGradeFile').onclick = function () {
        deleteGradeFile(fileId);
        modal.hide();
    };
}

// 删除成绩文件
function deleteGradeFile(fileId) {
    fetch(`/Teachers/DeleteGradeFile?id=${fileId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除失败');
            }
            return response.json();
        })
        .then(data => {
            // 重新加载文件列表
            loadGradeFiles();

            // 如果当前正在显示该文件的数据，则隐藏数据卡片
            hideGradeDataIfDeleted(fileId);

            // 显示删除成功消息
            showAlert('success', '成绩文件已删除');
        })
        .catch(error => {
            console.error('删除成绩文件出错:', error);
            showAlert('error', '删除成绩文件失败，请稍后重试');
        });
}

// 如果删除的是正在显示的文件，则隐藏数据卡片
function hideGradeDataIfDeleted(fileId) {
    const currentFileIdElement = document.querySelector('#gradeDataCard[data-file-id="' + fileId + '"]');
    if (currentFileIdElement) {
        document.getElementById('gradeDataCard').style.display = 'none';
        document.getElementById('gradeChartCard').style.display = 'none';
        document.getElementById('analysisReportCard').style.display = 'none';

        // 清空当前数据
        currentGradeData = null;

        // 销毁图表
        if (currentGradeChart) {
            currentGradeChart.destroy();
            currentGradeChart = null;
        }
    }
}

// 从URL加载成绩数据
async function loadGradeDataFromUrl(fileUrl, fileName) {
    try {
        // 显示加载中提示
        showAlert('info', '正在加载成绩数据，请稍候...');

        // 使用XHR请求以尝试绕过CORS限制
        const xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.responseType = 'arraybuffer'; // 请求二进制数据
        xhr.withCredentials = false; // 不发送凭证

        // 等待文件加载完成
        const arrayBuffer = await new Promise((resolve, reject) => {
            xhr.onload = function () {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject(new Error('无法获取文件内容，状态码: ' + xhr.status));
                }
            };
            xhr.onerror = function () {
                reject(new Error('无法获取文件内容，请检查网络连接'));
            };
            xhr.send();
        });

        // 使用 SheetJS 解析 Excel 文件
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        // 验证数据格式 - 至少需要包含姓名和成绩两列
        if (data.length === 0) {
            throw new Error('成绩数据为空');
        }

        // 尝试识别列名（可能是"姓名"和"成绩"，或者是"学生姓名"和"分数"等）
        const firstRow = data[0];
        const nameKey = Object.keys(firstRow).find(key =>
            ['姓名', '学生姓名', '学生', 'name', '名字'].some(nameStr =>
                key.toLowerCase().includes(nameStr.toLowerCase())
            )
        );

        const scoreKey = Object.keys(firstRow).find(key =>
            ['成绩', '分数', '得分', 'score', '考试成绩'].some(scoreStr =>
                key.toLowerCase().includes(scoreStr.toLowerCase())
            )
        );

        if (!nameKey || !scoreKey) {
            throw new Error('无法识别姓名或成绩列，请确保Excel文件包含"姓名"和"成绩"两列');
        }

        // 处理并规范化数据
        const gradeData = data.map(row => {
            // 确保成绩是数字
            const score = parseFloat(row[scoreKey]);
            return {
                name: row[nameKey],
                score: isNaN(score) ? 0 : score
            };
        });

        // 保存当前数据
        currentGradeData = gradeData;

        // 更新页面显示
        displayGradeData(gradeData, fileName);

        // 创建图表
        createGradeChart(gradeData);

        // 显示分析报告区域
        document.getElementById('analysisReportCard').style.display = 'block';

        // 自动生成分析报告
        generateAnalysisReport();

    } catch (error) {
        console.error('加载成绩数据出错:', error);
        showAlert('error', error.message || '加载成绩数据失败，请检查文件格式');
    }
}

// 显示成绩数据
function displayGradeData(gradeData, fileName) {
    // 显示卡片
    const dataCard = document.getElementById('gradeDataCard');
    dataCard.style.display = 'block';

    // 更新文件名
    document.getElementById('currentFileName').textContent = fileName;

    // 更新统计数据
    const totalStudents = gradeData.length;
    const scores = gradeData.map(item => item.score);
    const avgScore = scores.reduce((acc, curr) => acc + curr, 0) / totalStudents;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('averageScore').textContent = avgScore.toFixed(2);
    document.getElementById('highestScore').textContent = maxScore.toFixed(1);
    document.getElementById('lowestScore').textContent = minScore.toFixed(1);

    // 清空表格
    const tableBody = document.getElementById('gradeDataTable').querySelector('tbody');
    tableBody.innerHTML = '';

    // 填充表格数据
    gradeData.forEach(student => {
        const row = document.createElement('tr');

        // 获取评级
        const scoreRating = getScoreRating(student.score);

        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.score.toFixed(1)}</td>
            <td><span class="badge ${scoreRating.color}">${scoreRating.label}</span></td>
        `;

        tableBody.appendChild(row);
    });

    // 显示图表卡片
    document.getElementById('gradeChartCard').style.display = 'block';
}

// 获取成绩评级
function getScoreRating(score) {
    if (score >= 90) {
        return { label: '优秀', color: 'bg-success' };
    } else if (score >= 80) {
        return { label: '良好', color: 'bg-primary' };
    } else if (score >= 70) {
        return { label: '中等', color: 'bg-info' };
    } else if (score >= 60) {
        return { label: '及格', color: 'bg-warning' };
    } else {
        return { label: '不及格', color: 'bg-danger' };
    }
}

// 创建成绩图表
function createGradeChart(gradeData) {
    // 获取Canvas元素
    const ctx = document.getElementById('gradeChart').getContext('2d');

    // 如果已经存在图表，先销毁
    if (currentGradeChart) {
        currentGradeChart.destroy();
    }

    // 准备数据
    const labels = gradeData.map(item => item.name);
    const scores = gradeData.map(item => item.score);

    // 创建图表
    currentGradeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '成绩',
                data: scores,
                backgroundColor: scores.map(score => {
                    if (score >= 90) return 'rgba(40, 167, 69, 0.7)'; // 优秀 - 绿色
                    if (score >= 80) return 'rgba(0, 123, 255, 0.7)'; // 良好 - 蓝色
                    if (score >= 70) return 'rgba(23, 162, 184, 0.7)'; // 中等 - 青色
                    if (score >= 60) return 'rgba(255, 193, 7, 0.7)'; // 及格 - 黄色
                    return 'rgba(220, 53, 69, 0.7)'; // 不及格 - 红色
                }),
                borderColor: scores.map(score => {
                    if (score >= 90) return 'rgb(40, 167, 69)';
                    if (score >= 80) return 'rgb(0, 123, 255)';
                    if (score >= 70) return 'rgb(23, 162, 184)';
                    if (score >= 60) return 'rgb(255, 193, 7)';
                    return 'rgb(220, 53, 69)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}分`;
                        }
                    }
                }
            }
        }
    });
}

// 更新图表类型
function updateChartType() {
    if (!currentGradeData || !currentGradeChart) return;

    const chartType = document.getElementById('chartType').value;

    // 修改图表类型
    currentGradeChart.config.type = chartType;

    // 特殊处理饼图类型
    if (chartType === 'pie') {
        // 对成绩进行分组
        let excellent = 0, good = 0, average = 0, pass = 0, fail = 0;

        currentGradeData.forEach(student => {
            if (student.score >= 90) excellent++;
            else if (student.score >= 80) good++;
            else if (student.score >= 70) average++;
            else if (student.score >= 60) pass++;
            else fail++;
        });

        // 更新饼图数据
        currentGradeChart.data.labels = ['优秀(90+)', '良好(80-89)', '中等(70-79)', '及格(60-69)', '不及格(<60)'];
        currentGradeChart.data.datasets[0].data = [excellent, good, average, pass, fail];
        currentGradeChart.data.datasets[0].backgroundColor = [
            'rgba(40, 167, 69, 0.7)',  // 绿色 - 优秀
            'rgba(0, 123, 255, 0.7)',  // 蓝色 - 良好
            'rgba(23, 162, 184, 0.7)', // 青色 - 中等
            'rgba(255, 193, 7, 0.7)',  // 黄色 - 及格
            'rgba(220, 53, 69, 0.7)'   // 红色 - 不及格
        ];

        // 更新配置
        currentGradeChart.options.scales = undefined; // 饼图不需要坐标轴

    } else if (chartType === 'histogram') {
        // 创建直方图数据
        const histogramData = [];
        const ranges = [0, 60, 70, 80, 90, 100];

        for (let i = 0; i < ranges.length - 1; i++) {
            const min = ranges[i];
            const max = ranges[i + 1];
            const count = currentGradeData.filter(s => s.score >= min && s.score < max).length;
            histogramData.push(count);
        }

        // 更新直方图数据
        currentGradeChart.data.labels = ['0-59', '60-69', '70-79', '80-89', '90-100'];
        currentGradeChart.data.datasets[0].data = histogramData;
        currentGradeChart.data.datasets[0].backgroundColor = [
            'rgba(220, 53, 69, 0.7)',  // 红色 - 不及格
            'rgba(255, 193, 7, 0.7)',  // 黄色 - 及格
            'rgba(23, 162, 184, 0.7)', // 青色 - 中等
            'rgba(0, 123, 255, 0.7)',  // 蓝色 - 良好
            'rgba(40, 167, 69, 0.7)'   // 绿色 - 优秀
        ];

        // 恢复坐标轴
        currentGradeChart.options.scales = {
            y: {
                beginAtZero: true
            }
        };

    } else {
        // 恢复原始数据
        currentGradeChart.data.labels = currentGradeData.map(item => item.name);
        currentGradeChart.data.datasets[0].data = currentGradeData.map(item => item.score);
        currentGradeChart.data.datasets[0].backgroundColor = currentGradeData.map(item => {
            const score = item.score;
            if (score >= 90) return 'rgba(40, 167, 69, 0.7)';
            if (score >= 80) return 'rgba(0, 123, 255, 0.7)';
            if (score >= 70) return 'rgba(23, 162, 184, 0.7)';
            if (score >= 60) return 'rgba(255, 193, 7, 0.7)';
            return 'rgba(220, 53, 69, 0.7)';
        });

        // 恢复坐标轴
        currentGradeChart.options.scales = {
            y: {
                beginAtZero: true,
                max: 100
            }
        };
    }

    // 更新图表
    currentGradeChart.update();
}

// 应用筛选
function applyFilter() {
    if (!currentGradeData) return;

    const filterOption = document.getElementById('filterOptions').value;
    let filteredData;

    switch (filterOption) {
        case 'above90':
            filteredData = currentGradeData.filter(item => item.score >= 90);
            break;
        case 'above80':
            filteredData = currentGradeData.filter(item => item.score >= 80);
            break;
        case 'above70':
            filteredData = currentGradeData.filter(item => item.score >= 70);
            break;
        case 'above60':
            filteredData = currentGradeData.filter(item => item.score >= 60);
            break;
        case 'below60':
            filteredData = currentGradeData.filter(item => item.score < 60);
            break;
        case 'all':
        default:
            filteredData = [...currentGradeData];
            break;
    }

    // 更新表格
    displayGradeData(filteredData, document.getElementById('currentFileName').textContent);

    // 更新图表
    const chartType = document.getElementById('chartType').value;

    // 临时保存当前类型
    const currentType = currentGradeChart.config.type;

    // 销毁当前图表
    currentGradeChart.destroy();

    // 创建新图表
    createGradeChart(filteredData);

    // 恢复图表类型
    if (currentType !== 'bar') {
        currentGradeChart.config.type = currentType;
        currentGradeChart.update();
    }
}

// 排序成绩数据
function sortGradeData(sortBy) {
    if (!currentGradeData) return;

    const sortNameBtn = document.getElementById('sortNameBtn');
    const sortScoreBtn = document.getElementById('sortScoreBtn');

    // 创建一个新的排序数据数组
    let sortedData = [...currentGradeData];

    if (sortBy === 'name') {
        // 检查按钮状态
        if (sortNameBtn.dataset.order === 'desc') {
            // 降序变升序
            sortedData.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
            sortNameBtn.dataset.order = 'asc';
            sortNameBtn.innerHTML = '<i class="fas fa-sort-alpha-down me-1"></i> 按姓名排序';
        } else {
            // 升序变降序
            sortedData.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
            sortNameBtn.dataset.order = 'desc';
            sortNameBtn.innerHTML = '<i class="fas fa-sort-alpha-up me-1"></i> 按姓名排序';
        }

        // 重置另一个按钮
        sortScoreBtn.dataset.order = '';
        sortScoreBtn.innerHTML = '<i class="fas fa-sort-numeric-down me-1"></i> 按成绩排序';
    } else if (sortBy === 'score') {
        // 检查按钮状态
        if (sortScoreBtn.dataset.order === 'desc') {
            // 降序变升序
            sortedData.sort((a, b) => a.score - b.score);
            sortScoreBtn.dataset.order = 'asc';
            sortScoreBtn.innerHTML = '<i class="fas fa-sort-numeric-down me-1"></i> 按成绩排序';
        } else {
            // 升序变降序
            sortedData.sort((a, b) => b.score - a.score);
            sortScoreBtn.dataset.order = 'desc';
            sortScoreBtn.innerHTML = '<i class="fas fa-sort-numeric-up me-1"></i> 按成绩排序';
        }

        // 重置另一个按钮
        sortNameBtn.dataset.order = '';
        sortNameBtn.innerHTML = '<i class="fas fa-sort-alpha-down me-1"></i> 按姓名排序';
    }

    // 更新表格
    displayGradeData(sortedData, document.getElementById('currentFileName').textContent);

    // 更新图表 - 保持当前的图表类型和筛选
    const chartType = document.getElementById('chartType').value;

    // 临时保存当前类型
    const currentType = currentGradeChart.config.type;

    // 销毁当前图表
    currentGradeChart.destroy();

    // 创建新图表
    createGradeChart(sortedData);

    // 恢复图表类型
    if (currentType !== 'bar') {
        currentGradeChart.config.type = currentType;
        currentGradeChart.update();
    }
}

// 生成分析报告
function generateAnalysisReport() {
    if (!currentGradeData) return;

    const reportContainer = document.getElementById('analysisReport');

    // 计算统计数据
    const totalStudents = currentGradeData.length;
    const scores = currentGradeData.map(item => item.score);
    const avgScore = scores.reduce((acc, curr) => acc + curr, 0) / totalStudents;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 计算及格率和优良率
    const passCount = scores.filter(score => score >= 60).length;
    const excellentCount = scores.filter(score => score >= 80).length;
    const passRate = (passCount / totalStudents * 100).toFixed(2);
    const excellentRate = (excellentCount / totalStudents * 100).toFixed(2);

    // 计算标准差
    const variance = scores.reduce((acc, curr) => acc + Math.pow(curr - avgScore, 2), 0) / totalStudents;
    const stdDev = Math.sqrt(variance).toFixed(2);

    // 计算成绩分布
    const scoreDistribution = {
        '90-100': scores.filter(score => score >= 90 && score <= 100).length,
        '80-89': scores.filter(score => score >= 80 && score < 90).length,
        '70-79': scores.filter(score => score >= 70 && score < 80).length,
        '60-69': scores.filter(score => score >= 60 && score < 70).length,
        '0-59': scores.filter(score => score < 60).length
    };

    // 生成报告内容
    const fileName = document.getElementById('currentFileName').textContent;
    const reportContent = `
        <div class="row">
            <div class="col-md-12">
                <h4 class="mb-3">${fileName} - 成绩分析报告</h4>
                <p>本次考试共有 <strong>${totalStudents}</strong> 名学生参加，平均分为 <strong>${avgScore.toFixed(2)}</strong> 分，
                最高分为 <strong>${maxScore.toFixed(1)}</strong> 分，最低分为 <strong>${minScore.toFixed(1)}</strong> 分。</p>
                
                <div class="row mt-4">
                    <div class="col-md-6">
                        <h5>总体情况</h5>
                        <ul class="list-group mb-3">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                及格率
                                <span class="badge bg-primary rounded-pill">${passRate}%</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                优良率
                                <span class="badge bg-success rounded-pill">${excellentRate}%</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                标准差
                                <span class="badge bg-info rounded-pill">${stdDev}</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="col-md-6">
                        <h5>成绩分布</h5>
                        <ul class="list-group mb-3">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                优秀 (90-100)
                                <span class="badge bg-success rounded-pill">${scoreDistribution['90-100']} 人 (${(scoreDistribution['90-100'] / totalStudents * 100).toFixed(2)}%)</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                良好 (80-89)
                                <span class="badge bg-primary rounded-pill">${scoreDistribution['80-89']} 人 (${(scoreDistribution['80-89'] / totalStudents * 100).toFixed(2)}%)</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                中等 (70-79)
                                <span class="badge bg-info rounded-pill">${scoreDistribution['70-79']} 人 (${(scoreDistribution['70-79'] / totalStudents * 100).toFixed(2)}%)</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                及格 (60-69)
                                <span class="badge bg-warning rounded-pill">${scoreDistribution['60-69']} 人 (${(scoreDistribution['60-69'] / totalStudents * 100).toFixed(2)}%)</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                不及格 (0-59)
                                <span class="badge bg-danger rounded-pill">${scoreDistribution['0-59']} 人 (${(scoreDistribution['0-59'] / totalStudents * 100).toFixed(2)}%)</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="mt-4">
                    <h5>分析结论</h5>
                    <div class="card">
                        <div class="card-body">
                            ${generateAnalysisConclusion(avgScore, passRate, excellentRate, stdDev, scoreDistribution, totalStudents)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 更新报告内容
    reportContainer.innerHTML = reportContent;
}

// 生成分析结论
function generateAnalysisConclusion(avgScore, passRate, excellentRate, stdDev, distribution, total) {
    let conclusions = [];

    // 根据平均分评价
    if (avgScore >= 85) {
        conclusions.push('本次考试整体表现优秀，平均分达到了较高水平。');
    } else if (avgScore >= 75) {
        conclusions.push('本次考试整体表现良好，平均分处于中上水平。');
    } else if (avgScore >= 60) {
        conclusions.push('本次考试整体表现一般，平均分刚达到及格线。');
    } else {
        conclusions.push('本次考试整体表现较差，平均分未达到及格线，需要加强复习。');
    }

    // 根据及格率评价
    if (passRate >= 90) {
        conclusions.push('及格率非常高，大部分学生已掌握主要知识点。');
    } else if (passRate >= 80) {
        conclusions.push('及格率较高，多数学生掌握了基本知识点。');
    } else if (passRate >= 60) {
        conclusions.push('及格率一般，部分学生对知识点的掌握还不够牢固。');
    } else {
        conclusions.push('及格率较低，大多数学生对知识点的掌握存在明显不足，建议针对性复习。');
    }

    // 根据标准差评价
    if (parseFloat(stdDev) < 10) {
        conclusions.push('成绩分布较为集中，学生之间水平差距不大。');
    } else if (parseFloat(stdDev) < 15) {
        conclusions.push('成绩分布较为分散，学生之间存在一定的水平差距。');
    } else {
        conclusions.push('成绩分布非常分散，学生之间的水平差距较大，建议关注学习能力弱的学生。');
    }

    // 根据不及格人数提出建议
    const failCount = distribution['0-59'];
    const failRate = (failCount / total * 100).toFixed(2);

    if (failRate > 30) {
        conclusions.push(`不及格学生比例较高（${failRate}%），建议针对这部分学生开展补习，帮助他们查漏补缺。`);
    }

    // 根据优秀率提出建议
    if (excellentRate < 20) {
        conclusions.push('优秀学生比例较低，建议分析试卷难度和教学方法，提高学生的学习兴趣和能力。');
    } else if (excellentRate > 50) {
        conclusions.push('优秀学生比例较高，可以考虑适当增加教学难度，挑战学生的潜力。');
    }

    return conclusions.join(' ');
}

// 导出分析报告
function exportAnalysisReport() {
    if (!currentGradeData) return;

    const fileName = document.getElementById('currentFileName').textContent;
    const reportContent = document.getElementById('analysisReport').innerHTML;

    // 创建一个新的HTML文档
    const reportDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${fileName} - 成绩分析报告</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2, h3, h4, h5 { color: #333; }
                .container { max-width: 800px; margin: 0 auto; }
                .card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
                .list-group { list-style: none; padding: 0; }
                .list-group-item { border: 1px solid #ddd; margin-bottom: -1px; padding: 10px 15px; display: flex; justify-content: space-between; }
                .badge { padding: 5px 10px; border-radius: 10px; color: white; }
                .bg-primary { background-color: #007bff; }
                .bg-success { background-color: #28a745; }
                .bg-info { background-color: #17a2b8; }
                .bg-warning { background-color: #ffc107; color: #212529; }
                .bg-danger { background-color: #dc3545; }
                .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
                .col-md-6 { width: 50%; padding: 0 15px; box-sizing: border-box; }
                .col-md-12 { width: 100%; padding: 0 15px; box-sizing: border-box; }
                .mt-4 { margin-top: 1.5rem; }
                .mb-3 { margin-bottom: 1rem; }
            </style>
        </head>
        <body>
            <div class="container">
                ${reportContent}
            </div>
        </body>
        </html>
    `;

    // 创建下载链接
    const blob = new Blob([reportDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-成绩分析报告.html`;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// 显示提示消息
function showAlert(type, message) {
    // 移除现有的提示
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // 创建新的提示
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');

    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // 添加到页面
    document.querySelector('.page-header').insertAdjacentElement('afterend', alertDiv);

    // 3秒后自动关闭
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 3000);
}