// 点击处理模块
export class ClickHandler {
    constructor(app) {
        this.app = app;
    }

    processClick(clientX, clientY) {
        const rect = this.app.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;
        
        // 转换为图片坐标（考虑偏移量和缩放）
        const imageX = (canvasX - this.app.offsetX) / this.app.zoom;
        const imageY = (canvasY - this.app.offsetY) / this.app.zoom;
        
        // 转换为原始图像坐标
        const originalX = Math.floor(imageX);
        const originalY = Math.floor(imageY);
        
        // 检查坐标是否在图像范围内
        if (originalX >= 0 && originalX < this.app.originalWidth && 
            originalY >= 0 && originalY < this.app.originalHeight) {
            
            // 转换为用户坐标系统（左上角为(1,1)）
            const userX = originalX + 1;
            const userY = originalY + 1;
            
            // 复制到剪切板
            this.copyToClipboard(`${userX},${userY}`);
            
            // 更新显示
            this.app.updateCoordinates(userX, userY);
            
            // 绘制点击标记
            this.drawClickMarker(canvasX, canvasY);
        }
    }

    drawClickMarker(x, y) {
        // 保存当前状态
        this.app.ctx.save();
        
        // 绘制十字标记
        this.app.ctx.strokeStyle = 'red';
        this.app.ctx.lineWidth = Math.max(2, this.app.zoom);
        this.app.ctx.beginPath();
        const markerSize = Math.max(8, this.app.zoom * 4);
        this.app.ctx.moveTo(x - markerSize, y);
        this.app.ctx.lineTo(x + markerSize, y);
        this.app.ctx.moveTo(x, y - markerSize);
        this.app.ctx.lineTo(x, y + markerSize);
        this.app.ctx.stroke();
        
        // 添加触摸反馈动画（移动端）
        if (this.app.isMobile()) {
            this.addTouchFeedback(x, y);
        }
        
        // 恢复状态
        this.app.ctx.restore();
        
        // 2秒后重新渲染图片移除标记
        setTimeout(() => {
            this.app.imageRenderer.renderImage();
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
        
        this.app.canvasContainer.appendChild(feedback);
        
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
                this.app.updateStatus(`坐标 ${text} 已复制到剪切板`);
            } else {
                // 移动端备用方案
                if (this.app.isMobile()) {
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
                        this.app.updateStatus(`坐标 ${text} 已复制到剪切板`);
                    } catch (err) {
                        this.app.updateStatus(`坐标 ${text} (请手动复制)`);
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
                    this.app.updateStatus(`坐标 ${text} 已复制到剪切板`);
                }
            }
        } catch (err) {
            console.error('复制失败:', err);
            this.app.updateStatus(`坐标 ${text} (复制失败，请手动复制)`);
        }
    }
} 