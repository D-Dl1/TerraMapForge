class PixelClickerApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.zoom = 1;
        this.imageData = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        // 图片偏移量
        this.offsetX = 0;
        this.offsetY = 0;
        
        // 触摸相关变量
        this.lastTouchDistance = 0;
        this.touchStartZoom = 1;
        this.isTouching = false;
        this.touchStartTime = 0;
        
        // 平移相关变量
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartOffsetX = 0;
        this.panStartOffsetY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // 缩放中心点
        this.zoomCenterX = 0;
        this.zoomCenterY = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateStatus('请选择并上传图片');
    }
    
    initializeElements() {
        this.uploadSection = document.getElementById('uploadSection');
        this.imageUpload = document.getElementById('imageUpload');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.resetZoomBtn = document.getElementById('resetZoom');
        this.zoomLevelSpan = document.getElementById('zoomLevel');
        this.coordinatesDiv = document.getElementById('coordinates');
        this.statusDiv = document.getElementById('status');
        this.canvasContainer = document.getElementById('canvasContainer');
        
        // 初始状态下禁用缩放按钮
        this.disableZoomControls();
    }
    
    disableZoomControls() {
        this.zoomInBtn.disabled = true;
        this.zoomOutBtn.disabled = true;
        this.resetZoomBtn.disabled = true;
    }
    
    enableZoomControls() {
        this.zoomInBtn.disabled = false;
        this.zoomOutBtn.disabled = false;
        this.resetZoomBtn.disabled = false;
    }
    
    loadImageFromFile(file) {
        this.updateStatus('加载图片中...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                this.originalWidth = this.image.width;
                this.originalHeight = this.image.height;
                
                this.updateStatus('图片加载完成');
                this.renderImage();
                this.enableZoomControls();
                this.updateZoomLevel();
            };
            
            this.image.onerror = () => {
                this.updateStatus('图片加载失败，请检查文件格式');
                console.error('无法加载图片文件');
            };
            
            this.image.src = e.target.result;
        };
        
        reader.onerror = () => {
            this.updateStatus('文件读取失败');
            console.error('无法读取文件');
        };
        
        reader.readAsDataURL(file);
    }
    
    renderImage() {
        if (!this.image) return;
        
        // 计算缩放后的尺寸
        const scaledWidth = this.originalWidth * this.zoom;
        const scaledHeight = this.originalHeight * this.zoom;
        
        // 获取容器尺寸
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 设置 canvas 尺寸为容器尺寸或图片尺寸中的较大者
        this.canvas.width = Math.max(containerWidth, scaledWidth);
        this.canvas.height = Math.max(containerHeight, scaledHeight);
        
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 限制偏移量范围
        this.limitOffset();
        
        // 绘制图片（考虑偏移量）
        this.ctx.imageSmoothingEnabled = false; // 保持像素清晰
        this.ctx.drawImage(
            this.image, 
            this.offsetX, 
            this.offsetY, 
            scaledWidth, 
            scaledHeight
        );
        
        // 获取图像数据用于像素检测
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // 自动补全不齐全的像素（如果需要）
        this.fillTransparentPixels();
        
        this.updateStatus(`图片渲染完成 (${this.originalWidth}x${this.originalHeight})`);
    }
    
    limitOffset() {
        if (!this.image) return;
        
        const scaledWidth = this.originalWidth * this.zoom;
        const scaledHeight = this.originalHeight * this.zoom;
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 限制偏移量，确保图片不会超出合理范围
        if (scaledWidth <= containerWidth) {
            // 图片小于容器时居中
            this.offsetX = (containerWidth - scaledWidth) / 2;
        } else {
            // 图片大于容器时允许平移，但限制范围
            this.offsetX = Math.min(0, Math.max(containerWidth - scaledWidth, this.offsetX));
        }
        
        if (scaledHeight <= containerHeight) {
            // 图片小于容器时居中
            this.offsetY = (containerHeight - scaledHeight) / 2;
        } else {
            // 图片大于容器时允许平移，但限制范围
            this.offsetY = Math.min(0, Math.max(containerHeight - scaledHeight, this.offsetY));
        }
    }
    
    fillTransparentPixels() {
        if (!this.imageData) return;
        
        const data = this.imageData.data;
        let hasTransparency = false;
        
        // 检查是否有透明像素
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] === 0) {
                hasTransparency = true;
                break;
            }
        }
        
        if (hasTransparency) {
            // 将透明像素填充为白色
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) {
                    data[i] = 255;     // R
                    data[i + 1] = 255; // G
                    data[i + 2] = 255; // B
                    data[i + 3] = 255; // A
                }
            }
            
            // 重新绘制修改后的图像数据
            this.ctx.putImageData(this.imageData, 0, 0);
            this.updateStatus('已自动补全透明像素');
        }
    }
    
    getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    setupEventListeners() {
        // 文件上传相关
        this.imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadBtn.disabled = false;
                this.uploadBtn.textContent = '上传图片';
            } else {
                this.uploadBtn.disabled = true;
                this.uploadBtn.textContent = '上传图片';
            }
        });
        
        this.uploadBtn.addEventListener('click', () => {
            const file = this.imageUpload.files[0];
            if (file) {
                this.loadImageFromFile(file);
            }
        });
        
        // 改进的拖拽上传支持
        this.setupDragAndDrop();
        
        // 缩放按钮
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.resetZoomBtn.addEventListener('click', () => this.resetZoom());
        
        // 键盘快捷键（仅在桌面端）
        if (!this.isMobile()) {
            document.addEventListener('keydown', (e) => {
                if (!this.image) return;
                
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
            });
        }
        
        // 画布交互事件
        this.setupCanvasInteraction();
    }
    
    setupDragAndDrop() {
        const uploadSection = this.uploadSection;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.remove('drag-over');
            });
        });
        
        uploadSection.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.imageUpload.files = files;
                    this.uploadBtn.disabled = false;
                    this.loadImageFromFile(file);
                } else {
                    this.updateStatus('请上传图片文件');
                }
            }
        });
    }
    
    setupCanvasInteraction() {
        // 鼠标事件（桌面端）
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // 触摸事件（移动端）
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // 阻止默认的触摸行为
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
        this.canvas.addEventListener('touchend', (e) => e.preventDefault());
    }
    
    handleClick(e) {
        if (!this.image) return;
        this.processClick(e.clientX, e.clientY);
    }
    
    handleTouchStart(e) {
        if (!this.image) return;
        
        this.isTouching = true;
        this.touchStartTime = Date.now();
        
        if (e.touches.length === 1) {
            // 单指触摸 - 准备平移或点击
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.panStartX = touch.clientX;
            this.panStartY = touch.clientY;
            this.panStartOffsetX = this.offsetX;
            this.panStartOffsetY = this.offsetY;
            this.isPanning = false;
            
            // 调试信息
            console.log(`触摸开始: startX=${this.panStartX}, startY=${this.panStartY}, offsetX=${this.panStartOffsetX}, offsetY=${this.panStartOffsetY}`);
        } else if (e.touches.length === 2) {
            // 双指缩放开始
            this.lastTouchDistance = this.getTouchDistance(e.touches);
            this.touchStartZoom = this.zoom;
            
            // 计算缩放中心点
            const rect = this.canvas.getBoundingClientRect();
            this.zoomCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            this.zoomCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
            
            this.isPanning = false;
        }
    }
    
    handleTouchMove(e) {
        if (!this.image || !this.isTouching) return;
        
        if (e.touches.length === 1) {
            // 单指平移
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.panStartX;
            const deltaY = touch.clientY - this.panStartY;
            
            // 判断是否开始平移（移动距离超过阈值）
            const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (moveDistance > 5) { // 降低阈值，更容易触发平移
                this.isPanning = true;
            }
            
            if (this.isPanning) {
                // 计算新的偏移量
                const newOffsetX = this.panStartOffsetX + deltaX;
                const newOffsetY = this.panStartOffsetY + deltaY;
                
                // 临时设置偏移量以便limitOffset处理
                this.offsetX = newOffsetX;
                this.offsetY = newOffsetY;
                
                // 调试信息
                console.log(`平移中: deltaX=${deltaX}, deltaY=${deltaY}, offsetX=${this.offsetX}, offsetY=${this.offsetY}`);
                
                this.renderImage();
            }
        } else if (e.touches.length === 2) {
            // 双指缩放
            const currentDistance = this.getTouchDistance(e.touches);
            if (this.lastTouchDistance > 0) {
                const scale = currentDistance / this.lastTouchDistance;
                const newZoom = this.touchStartZoom * scale;
                
                // 限制缩放范围
                const oldZoom = this.zoom;
                this.zoom = Math.min(Math.max(newZoom, 0.1), 10);
                
                // 计算缩放后的偏移调整（以缩放中心点为准）
                const zoomRatio = this.zoom / oldZoom;
                this.offsetX = this.zoomCenterX - (this.zoomCenterX - this.offsetX) * zoomRatio;
                this.offsetY = this.zoomCenterY - (this.zoomCenterY - this.offsetY) * zoomRatio;
                
                this.renderImage();
                this.updateZoomLevel();
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.image) return;
        
        const touchDuration = Date.now() - this.touchStartTime;
        
        if (e.touches.length === 0) {
            // 所有手指离开
            if (!this.isPanning && touchDuration < 300) {
                // 快速点击且没有平移
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (moveDistance < 5) { // 与平移阈值保持一致
                    this.processClick(touch.clientX, touch.clientY);
                }
            }
            
            this.isTouching = false;
            this.isPanning = false;
            this.lastTouchDistance = 0;
        }
    }
    
    processClick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;
        
        // 转换为图片坐标（考虑偏移量和缩放）
        const imageX = (canvasX - this.offsetX) / this.zoom;
        const imageY = (canvasY - this.offsetY) / this.zoom;
        
        // 转换为原始图像坐标
        const originalX = Math.floor(imageX);
        const originalY = Math.floor(imageY);
        
        // 检查坐标是否在图像范围内
        if (originalX >= 0 && originalX < this.originalWidth && 
            originalY >= 0 && originalY < this.originalHeight) {
            
            // 转换为用户坐标系统（左上角为(1,1)）
            const userX = originalX + 1;
            const userY = originalY + 1;
            
            // 复制到剪切板
            this.copyToClipboard(`${userX},${userY}`);
            
            // 更新显示
            this.updateCoordinates(userX, userY);
            
            // 绘制点击标记
            this.drawClickMarker(canvasX, canvasY);
        }
    }
    
    drawClickMarker(x, y) {
        // 保存当前状态
        this.ctx.save();
        
        // 绘制十字标记
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = Math.max(2, this.zoom);
        this.ctx.beginPath();
        const markerSize = Math.max(8, this.zoom * 4);
        this.ctx.moveTo(x - markerSize, y);
        this.ctx.lineTo(x + markerSize, y);
        this.ctx.moveTo(x, y - markerSize);
        this.ctx.lineTo(x, y + markerSize);
        this.ctx.stroke();
        
        // 添加触摸反馈动画（移动端）
        if (this.isMobile()) {
            this.addTouchFeedback(x, y);
        }
        
        // 恢复状态
        this.ctx.restore();
        
        // 2秒后重新渲染图片移除标记
        setTimeout(() => {
            this.renderImage();
        }, 2000);
    }
    
    addTouchFeedback(x, y) {
        // 创建触摸反馈圆圈
        const feedback = document.createElement('div');
        feedback.style.position = 'absolute';
        feedback.style.left = (x - 20) + 'px';
        feedback.style.top = (y - 20) + 'px';
        feedback.style.width = '40px';
        feedback.style.height = '40px';
        feedback.style.borderRadius = '50%';
        feedback.style.backgroundColor = 'rgba(0, 124, 186, 0.3)';
        feedback.style.border = '2px solid rgba(0, 124, 186, 0.6)';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1000';
        feedback.className = 'touch-ripple';
        
        this.canvasContainer.appendChild(feedback);
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.updateStatus(`坐标 ${text} 已复制到剪切板`);
            } else {
                // 移动端备用方案
                if (this.isMobile()) {
                    // 创建临时输入框
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    try {
                        document.execCommand('copy');
                        this.updateStatus(`坐标 ${text} 已复制到剪切板`);
                    } catch (err) {
                        this.updateStatus(`坐标 ${text} (请手动复制)`);
                    }
                    
                    document.body.removeChild(textArea);
                } else {
                    // 桌面端备用方案
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.updateStatus(`坐标 ${text} 已复制到剪切板`);
                }
            }
        } catch (err) {
            console.error('复制失败:', err);
            this.updateStatus(`坐标 ${text} (复制失败，请手动复制)`);
        }
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    zoomIn() {
        if (this.zoom < 10) {
            const oldZoom = this.zoom;
            this.zoom = Math.min(this.zoom * 1.5, 10);
            
            // 以画布中心为缩放中心
            const rect = this.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const zoomRatio = this.zoom / oldZoom;
            this.offsetX = centerX - (centerX - this.offsetX) * zoomRatio;
            this.offsetY = centerY - (centerY - this.offsetY) * zoomRatio;
            
            this.renderImage();
            this.updateZoomLevel();
        }
    }
    
    zoomOut() {
        if (this.zoom > 0.1) {
            const oldZoom = this.zoom;
            this.zoom = Math.max(this.zoom / 1.5, 0.1);
            
            // 以画布中心为缩放中心
            const rect = this.canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const zoomRatio = this.zoom / oldZoom;
            this.offsetX = centerX - (centerX - this.offsetX) * zoomRatio;
            this.offsetY = centerY - (centerY - this.offsetY) * zoomRatio;
            
            this.renderImage();
            this.updateZoomLevel();
        }
    }
    
    resetZoom() {
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.renderImage();
        this.updateZoomLevel();
    }
    
    updateZoomLevel() {
        const percentage = Math.round(this.zoom * 100);
        this.zoomLevelSpan.textContent = `缩放: ${percentage}%`;
        
        // 更新按钮状态
        if (this.image) {
            this.zoomInBtn.disabled = this.zoom >= 10;
            this.zoomOutBtn.disabled = this.zoom <= 0.1;
        }
    }
    
    updateCoordinates(x, y) {
        this.coordinatesDiv.textContent = `坐标: (${x}, ${y})`;
    }
    
    updateStatus(message) {
        this.statusDiv.textContent = `状态: ${message}`;
        
        // 移动端状态提示更明显
        if (this.isMobile()) {
            this.statusDiv.style.animation = 'none';
            setTimeout(() => {
                this.statusDiv.style.animation = 'touchFeedback 0.3s ease';
            }, 10);
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PixelClickerApp();
}); 