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

    renderImage() {
        if (!this.app.image) return;
        
        // 计算缩放后的尺寸
        const scaledWidth = this.app.originalWidth * this.app.zoom;
        const scaledHeight = this.app.originalHeight * this.app.zoom;
        
        // 获取容器尺寸
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // 设置 canvas 尺寸为容器尺寸或图片尺寸中的较大者
        this.app.canvas.width = Math.max(containerWidth, scaledWidth);
        this.app.canvas.height = Math.max(containerHeight, scaledHeight);
        
        // 清空画布
        this.app.ctx.clearRect(0, 0, this.app.canvas.width, this.app.canvas.height);
        
        // 限制偏移量范围
        this.limitOffset();
        
        // 绘制图片（考虑偏移量）
        this.app.ctx.imageSmoothingEnabled = false; // 保持像素清晰
        this.app.ctx.drawImage(
            this.app.image, 
            this.app.offsetX, 
            this.app.offsetY, 
            scaledWidth, 
            scaledHeight
        );
        
        // 获取图像数据用于像素检测
        this.app.imageData = this.app.ctx.getImageData(0, 0, this.app.canvas.width, this.app.canvas.height);
        
        // 自动补全不齐全的像素（如果需要）
        this.fillTransparentPixels();
        
        this.app.updateStatus(`图片渲染完成 (${this.app.originalWidth}x${this.app.originalHeight})`);
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
        
        const data = this.app.imageData.data;
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
            this.app.ctx.putImageData(this.app.imageData, 0, 0);
            this.app.updateStatus('已自动补全透明像素');
        }
    }
} 