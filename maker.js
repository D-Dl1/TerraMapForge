class PixelClickerApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.zoom = 1;
        this.imageData = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        // 触摸相关变量
        this.lastTouchDistance = 0;
        this.touchStartZoom = 1;
        this.isTouching = false;
        this.touchStartTime = 0;
        
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
        
        // 设置 canvas 尺寸
        this.canvas.width = scaledWidth;
        this.canvas.height = scaledHeight;
        
        // 清空画布
        this.ctx.clearRect(0, 0, scaledWidth, scaledHeight);
        
        // 绘制图片
        this.ctx.imageSmoothingEnabled = false; // 保持像素清晰
        this.ctx.drawImage(this.image, 0, 0, scaledWidth, scaledHeight);
        
        // 获取图像数据用于像素检测
        this.imageData = this.ctx.getImageData(0, 0, scaledWidth, scaledHeight);
        
        // 自动补全不齐全的像素（如果需要）
        this.fillTransparentPixels();
        
        this.updateStatus(`图片渲染完成 (${this.originalWidth}x${this.originalHeight})`);
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
        
        if (e.touches.length === 2) {
            // 双指缩放开始
            this.lastTouchDistance = this.getTouchDistance(e.touches);
            this.touchStartZoom = this.zoom;
        }
    }
    
    handleTouchMove(e) {
        if (!this.image || !this.isTouching) return;
        
        if (e.touches.length === 2) {
            // 双指缩放
            const currentDistance = this.getTouchDistance(e.touches);
            if (this.lastTouchDistance > 0) {
                const scale = currentDistance / this.lastTouchDistance;
                const newZoom = this.touchStartZoom * scale;
                
                // 限制缩放范围
                this.zoom = Math.min(Math.max(newZoom, 0.1), 10);
                this.renderImage();
                this.updateZoomLevel();
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.image) return;
        
        const touchDuration = Date.now() - this.touchStartTime;
        
        if (e.touches.length === 0 && touchDuration < 300) {
            // 单指快速点击
            const touch = e.changedTouches[0];
            this.processClick(touch.clientX, touch.clientY);
        }
        
        this.isTouching = false;
        this.lastTouchDistance = 0;
    }
    
    processClick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // 转换为原始图像坐标（考虑缩放）
        const originalX = Math.floor(x / this.zoom);
        const originalY = Math.floor(y / this.zoom);
        
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
            this.drawClickMarker(x, y);
        }
    }
    
    drawClickMarker(x, y) {
        // 保存当前状态
        this.ctx.save();
        
        // 绘制十字标记
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = Math.max(2, this.zoom);
        this.ctx.beginPath();
        const markerSize = Math.max(5, this.zoom * 3);
        this.ctx.moveTo(x - markerSize, y);
        this.ctx.lineTo(x + markerSize, y);
        this.ctx.moveTo(x, y - markerSize);
        this.ctx.lineTo(x, y + markerSize);
        this.ctx.stroke();
        
        // 恢复状态
        this.ctx.restore();
        
        // 2秒后重新渲染图片移除标记
        setTimeout(() => {
            this.renderImage();
        }, 2000);
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
            this.zoom = Math.min(this.zoom * 1.5, 10);
            this.renderImage();
            this.updateZoomLevel();
        }
    }
    
    zoomOut() {
        if (this.zoom > 0.1) {
            this.zoom = Math.max(this.zoom / 1.5, 0.1);
            this.renderImage();
            this.updateZoomLevel();
        }
    }
    
    resetZoom() {
        this.zoom = 1;
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
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PixelClickerApp();
}); 