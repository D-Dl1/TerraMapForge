// 图像渲染模块
export class ImageRenderer {
    constructor(app) {
        this.app = app;
    }

    loadImageFromFile(file) {
        this.app.updateStatus('加载图片中...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.app.image = new Image();
            this.app.image.onload = () => {
                this.app.originalWidth = this.app.image.width;
                this.app.originalHeight = this.app.image.height;
                
                this.app.updateStatus('图片加载完成');
                this.renderImage();
                this.app.enableZoomControls();
                this.app.updateZoomLevel();
            };
            
            this.app.image.onerror = () => {
                this.app.updateStatus('图片加载失败，请检查文件格式');
                console.error('无法加载图片文件');
            };
            
            this.app.image.src = e.target.result;
        };
        
        reader.onerror = () => {
            this.app.updateStatus('文件读取失败');
            console.error('无法读取文件');
        };
        
        reader.readAsDataURL(file);
    }

    // 简化的渲染请求
    requestRender() {
        requestAnimationFrame(() => this.renderImage());
    }

    renderImage() {
        if (!this.app.image) return;
        
        // 获取容器尺寸
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 设置 canvas 尺寸为容器尺寸
        if (this.app.canvas.width !== containerWidth || this.app.canvas.height !== containerHeight) {
            this.app.canvas.width = containerWidth;
            this.app.canvas.height = containerHeight;
            this.app.canvas.style.width = containerWidth + 'px';
            this.app.canvas.style.height = containerHeight + 'px';
        }
        
        // 清空画布
        this.app.ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        
        // 限制偏移量范围
        this.limitOffset();
        
        // 保存上下文状态
        this.app.ctx.save();
        
        // 禁用图像平滑以保持像素清晰
        this.app.ctx.imageSmoothingEnabled = false;
        this.app.ctx.webkitImageSmoothingEnabled = false;
        this.app.ctx.mozImageSmoothingEnabled = false;
        this.app.ctx.msImageSmoothingEnabled = false;
        
        // 简单的绘制逻辑：直接绘制整个图像
        const drawWidth = this.app.originalWidth * this.app.zoom;
        const drawHeight = this.app.originalHeight * this.app.zoom;
        
        this.app.ctx.drawImage(
            this.app.image,
            this.app.offsetX,
            this.app.offsetY,
            drawWidth,
            drawHeight
        );
        
        // 恢复上下文状态
        this.app.ctx.restore();
        
        // 重绘标记点
        if (this.app.clickHandler && this.app.clickHandler.redrawAllMarkers) {
            this.app.clickHandler.redrawAllMarkers();
        }
        
        this.app.updateStatus(`图片渲染完成 (${this.app.originalWidth}x${this.app.originalHeight}) 缩放: ${Math.round(this.app.zoom * 100)}%`);
    }

    limitOffset() {
        if (!this.app.image) return;
        
        const scaledWidth = this.app.originalWidth * this.app.zoom;
        const scaledHeight = this.app.originalHeight * this.app.zoom;
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 简单的边界限制逻辑
        // 如果图像小于容器，居中显示
        if (scaledWidth <= containerWidth) {
            this.app.offsetX = (containerWidth - scaledWidth) / 2;
        } else {
            // 如果图像大于容器，限制平移范围
            this.app.offsetX = Math.min(0, Math.max(containerWidth - scaledWidth, this.app.offsetX));
        }
        
        if (scaledHeight <= containerHeight) {
            this.app.offsetY = (containerHeight - scaledHeight) / 2;
        } else {
            this.app.offsetY = Math.min(0, Math.max(containerHeight - scaledHeight, this.app.offsetY));
        }
    }
} 