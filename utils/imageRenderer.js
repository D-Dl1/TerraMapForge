// 图像渲染模块
export class ImageRenderer {
    constructor(app) {
        this.app = app;
        this.renderRequestId = null;
        this.cachedImageData = null;
        this.lastRenderTime = 0;
        this.renderThrottleMs = 16; // 约60fps
        this.maxCanvasSize = 4096; // 限制canvas最大尺寸
    }

    loadImageFromFile(file) {
        this.app.updateStatus('加载图片中...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.app.image = new Image();
            this.app.image.onload = () => {
                this.app.originalWidth = this.app.image.width;
                this.app.originalHeight = this.app.image.height;
                
                // 清除缓存
                this.cachedImageData = null;
                
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

    // 节流渲染，避免频繁重绘
    requestRender() {
        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
        }
        
        this.renderRequestId = requestAnimationFrame(() => {
            const now = Date.now();
            if (now - this.lastRenderTime >= this.renderThrottleMs) {
                this.renderImage();
                this.lastRenderTime = now;
            } else {
                // 如果调用太频繁，延迟到下一帧
                this.renderRequestId = requestAnimationFrame(() => {
                    this.renderImage();
                    this.lastRenderTime = Date.now();
                });
            }
        });
    }

    renderImage() {
        if (!this.app.image) return;
        
        // 计算缩放后的尺寸
        const scaledWidth = this.app.originalWidth * this.app.zoom;
        const scaledHeight = this.app.originalHeight * this.app.zoom;
        
        // 获取容器尺寸
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 智能设置canvas尺寸，避免过大
        const canvasWidth = Math.min(
            Math.max(containerWidth, Math.min(scaledWidth, this.maxCanvasSize)),
            this.maxCanvasSize
        );
        const canvasHeight = Math.min(
            Math.max(containerHeight, Math.min(scaledHeight, this.maxCanvasSize)),
            this.maxCanvasSize
        );
        
        // 只在尺寸变化时重新设置canvas
        if (this.app.canvas.width !== canvasWidth || this.app.canvas.height !== canvasHeight) {
            this.app.canvas.width = canvasWidth;
            this.app.canvas.height = canvasHeight;
            this.cachedImageData = null; // 清除缓存
        }
        
        // 清空画布
        this.app.ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        
        // 限制偏移量范围
        this.limitOffset();
        
        // 绘制图片（考虑偏移量）
        this.app.ctx.imageSmoothingEnabled = false; // 保持像素清晰
        
        // 计算实际绘制区域，避免绘制看不见的部分
        const drawX = Math.max(0, this.app.offsetX);
        const drawY = Math.max(0, this.app.offsetY);
        const drawWidth = Math.min(scaledWidth, this.app.canvas.width - drawX);
        const drawHeight = Math.min(scaledHeight, this.app.canvas.height - drawY);
        
        // 计算源图像的对应区域
        const srcX = Math.max(0, -this.app.offsetX / this.app.zoom);
        const srcY = Math.max(0, -this.app.offsetY / this.app.zoom);
        const srcWidth = Math.min(this.app.originalWidth - srcX, drawWidth / this.app.zoom);
        const srcHeight = Math.min(this.app.originalHeight - srcY, drawHeight / this.app.zoom);
        
        if (srcWidth > 0 && srcHeight > 0) {
            this.app.ctx.drawImage(
                this.app.image,
                srcX, srcY, srcWidth, srcHeight,
                drawX, drawY, drawWidth, drawHeight
            );
        }
        
        // 延迟获取图像数据，避免每次都获取
        this.scheduleImageDataUpdate();
        
        // 重绘标记点
        setTimeout(() => {
            if (this.app.clickHandler && this.app.clickHandler.redrawAllMarkers) {
                this.app.clickHandler.redrawAllMarkers();
            }
        }, 10);
        
        this.app.updateStatus(`图片渲染完成 (${this.app.originalWidth}x${this.app.originalHeight}) 缩放: ${Math.round(this.app.zoom * 100)}%`);
    }

    // 延迟更新图像数据
    scheduleImageDataUpdate() {
        if (this.imageDataUpdateTimeout) {
            clearTimeout(this.imageDataUpdateTimeout);
        }
        
        this.imageDataUpdateTimeout = setTimeout(() => {
            try {
                this.app.imageData = this.app.ctx.getImageData(0, 0, this.app.canvas.width, this.app.canvas.height);
                this.fillTransparentPixels();
            } catch (e) {
                console.warn('无法获取图像数据:', e);
            }
        }, 100); // 100ms后更新
    }

    limitOffset() {
        if (!this.app.image) return;
        
        const scaledWidth = this.app.originalWidth * this.app.zoom;
        const scaledHeight = this.app.originalHeight * this.app.zoom;
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 限制偏移量，确保图片不会超出合理范围
        if (scaledWidth <= containerWidth) {
            // 图片小于容器时居中
            this.app.offsetX = (containerWidth - scaledWidth) / 2;
        } else {
            // 图片大于容器时允许平移，但限制范围
            this.app.offsetX = Math.min(0, Math.max(containerWidth - scaledWidth, this.app.offsetX));
        }
        
        if (scaledHeight <= containerHeight) {
            // 图片小于容器时居中
            this.app.offsetY = (containerHeight - scaledHeight) / 2;
        } else {
            // 图片大于容器时允许平移，但限制范围
            this.app.offsetY = Math.min(0, Math.max(containerHeight - scaledHeight, this.app.offsetY));
        }
    }

    fillTransparentPixels() {
        if (!this.app.imageData) return;
        
        // 避免重复处理
        if (this.cachedImageData === this.app.imageData) return;
        
        const data = this.app.imageData.data;
        let hasTransparency = false;
        
        // 检查是否有透明像素（只检查部分像素以提高性能）
        const step = Math.max(1, Math.floor(data.length / 40000)); // 采样检查
        for (let i = 3; i < data.length; i += 4 * step) {
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
            this.app.ctx.putImageData(this.app.imageData, 0, 0);
            this.app.updateStatus('已自动补全透明像素');
        }
        
        this.cachedImageData = this.app.imageData;
    }

    // 清理资源
    cleanup() {
        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
            this.renderRequestId = null;
        }
        
        if (this.imageDataUpdateTimeout) {
            clearTimeout(this.imageDataUpdateTimeout);
            this.imageDataUpdateTimeout = null;
        }
        
        this.cachedImageData = null;
    }
} 