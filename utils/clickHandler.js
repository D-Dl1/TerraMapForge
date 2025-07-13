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
            
            // 添加坐标到坐标管理器
            const success = this.app.coordinateManager.addCoordinate(userX, userY);
            
            if (success) {
                // 更新显示
                this.app.updateCoordinates(userX, userY);
                
                // 绘制点击标记
                this.drawClickMarker(canvasX, canvasY);
                
                this.app.updateStatus(`标记点已添加: (${userX}, ${userY})`);
            } else {
                this.app.updateStatus('无法添加标记点');
            }
        } else {
            this.app.updateStatus('请点击地图内的位置');
        }
    }

    drawClickMarker(x, y) {
        // 保存当前状态
        this.app.ctx.save();
        
        // 绘制标记点
        this.app.ctx.strokeStyle = 'red';
        this.app.ctx.fillStyle = 'red';
        this.app.ctx.lineWidth = Math.max(2, this.app.zoom);
        
        // 绘制圆形标记
        this.app.ctx.beginPath();
        const markerRadius = Math.max(4, this.app.zoom * 2);
        this.app.ctx.arc(x, y, markerRadius, 0, 2 * Math.PI);
        this.app.ctx.fill();
        
        // 绘制十字标记
        this.app.ctx.strokeStyle = 'white';
        this.app.ctx.lineWidth = Math.max(1, this.app.zoom * 0.5);
        this.app.ctx.beginPath();
        const crossSize = Math.max(6, this.app.zoom * 3);
        this.app.ctx.moveTo(x - crossSize, y);
        this.app.ctx.lineTo(x + crossSize, y);
        this.app.ctx.moveTo(x, y - crossSize);
        this.app.ctx.lineTo(x, y + crossSize);
        this.app.ctx.stroke();
        
        // 添加触摸反馈动画（移动端）
        if (this.app.isMobile()) {
            this.addTouchFeedback(x, y);
        }
        
        // 恢复状态
        this.app.ctx.restore();
        
        // 3秒后重新渲染图片移除标记
        setTimeout(() => {
            this.app.imageRenderer.renderImage();
            this.redrawAllMarkers();
        }, 3000);
    }

    // 重绘所有标记点
    redrawAllMarkers() {
        const coordinates = this.app.coordinateManager.getCoordinates();
        
        coordinates.forEach(coord => {
            // 转换坐标到画布坐标
            const canvasX = (coord.x - 1) * this.app.zoom + this.app.offsetX;
            const canvasY = (coord.y - 1) * this.app.zoom + this.app.offsetY;
            
            // 检查是否在可见区域内
            if (canvasX >= 0 && canvasX <= this.app.canvas.width &&
                canvasY >= 0 && canvasY <= this.app.canvas.height) {
                
                this.drawPermanentMarker(canvasX, canvasY, coord.isPlayer);
            }
        });
    }

    // 绘制永久标记点
    drawPermanentMarker(x, y, isPlayer = false) {
        this.app.ctx.save();
        
        // 根据是否是Player使用不同颜色
        const color = isPlayer ? '#007cba' : '#28a745';
        
        this.app.ctx.strokeStyle = color;
        this.app.ctx.fillStyle = color;
        this.app.ctx.lineWidth = Math.max(1, this.app.zoom * 0.8);
        
        // 绘制圆形标记
        this.app.ctx.beginPath();
        const markerRadius = Math.max(3, this.app.zoom * 1.5);
        this.app.ctx.arc(x, y, markerRadius, 0, 2 * Math.PI);
        this.app.ctx.fill();
        
        // 绘制边框
        this.app.ctx.strokeStyle = 'white';
        this.app.ctx.lineWidth = Math.max(0.5, this.app.zoom * 0.3);
        this.app.ctx.stroke();
        
        this.app.ctx.restore();
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
} 