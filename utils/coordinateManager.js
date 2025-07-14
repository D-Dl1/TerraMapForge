// 坐标管理模块
export class CoordinateManager {
    constructor(app) {
        this.app = app;
        this.coordinates = [];
        this.nextId = 1;
        
        // 拖拽相关变量
        this.draggedItem = null;
        this.isDragging = false;
        this.placeholder = null;
        this.currentAnimation = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.coordinatesList = document.getElementById('coordinatesList');
        this.coordinatesCount = document.getElementById('coordinatesCount');
        this.exportCoordsBtn = document.getElementById('exportCoords');
        this.exportNamesBtn = document.getElementById('exportNames');
        
        this.setupEventListeners();
        this.initializeDefault();
    }
    
    initializeDefault() {
        // 默认添加Player坐标点（电脑端和移动端都添加）
        this.addCoordinate(0, 0, 'Player', true);
    }
    
    setupEventListeners() {
        this.exportCoordsBtn.addEventListener('click', () => this.exportCoordinates());
        this.exportNamesBtn.addEventListener('click', () => this.exportNames());
    }
    
    addCoordinate(x, y, name = null, isPlayer = false) {
        // 检查是否超过最大限制
        if (this.coordinates.length >= this.maxCoordinates) {
            this.app.updateStatus('已达到最大标记点数量 (512)');
            return false;
        }
        
        // 生成默认名称
        if (!name) {
            name = `Bot${this.nextBotId}`;
            this.nextBotId++;
        }
        
        const coordinate = {
            id: Date.now() + Math.random(),
            x: x,
            y: y,
            name: name,
            isPlayer: isPlayer
        };
        
        this.coordinates.push(coordinate);
        this.renderCoordinatesList();
        this.updateCount();
        
        return true;
    }
    
    removeCoordinate(id) {
        const index = this.coordinates.findIndex(coord => coord.id === id);
        if (index !== -1) {
            const coord = this.coordinates[index];
            // 不允许删除Player坐标
            if (coord.isPlayer) {
                return false;
            }
            
            this.coordinates.splice(index, 1);
            this.renderCoordinatesList();
            this.updateCount();
            
            // 重绘标记点
            setTimeout(() => {
                if (this.app.clickHandler && this.app.clickHandler.redrawAllMarkers) {
                    this.app.clickHandler.redrawAllMarkers();
                }
            }, 10);
            
            return true;
        }
        return false;
    }
    
    updateCoordinateName(id, newName) {
        const coord = this.coordinates.find(coord => coord.id === id);
        if (coord) {
            coord.name = newName;
            return true;
        }
        return false;
    }
    
    moveCoordinate(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.coordinates.length ||
            toIndex < 0 || toIndex >= this.coordinates.length) {
            return false;
        }
        
        const [movedItem] = this.coordinates.splice(fromIndex, 1);
        this.coordinates.splice(toIndex, 0, movedItem);
        this.renderCoordinatesList();
        return true;
    }
    
    renderCoordinatesList() {
        this.coordinatesList.innerHTML = '';
        
        this.coordinates.forEach((coord, index) => {
            const item = document.createElement('div');
            item.className = `coordinate-item ${coord.isPlayer ? 'player' : ''}`;
            item.draggable = true;
            item.dataset.id = coord.id;
            item.dataset.index = index;
            
            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.textContent = '⋮⋮';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'info';
            
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'coords';
            coordsDiv.textContent = `${coord.x}, ${coord.y}`;
            // 添加点击坐标显示特效的功能
            coordsDiv.style.cursor = 'pointer';
            coordsDiv.title = '点击在地图上显示位置';
            coordsDiv.addEventListener('click', () => {
                this.showCoordinateOnMap(coord.x, coord.y, coord.isPlayer);
            });
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'name';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = coord.name;
            nameInput.readOnly = coord.isPlayer;
            nameInput.addEventListener('change', () => {
                this.updateCoordinateName(coord.id, nameInput.value);
            });
            
            nameDiv.appendChild(nameInput);
            infoDiv.appendChild(coordsDiv);
            infoDiv.appendChild(nameDiv);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.disabled = coord.isPlayer;
            
            // 为Player坐标添加更好的提示
            if (coord.isPlayer) {
                deleteBtn.title = '无法删除玩家坐标';
                deleteBtn.setAttribute('aria-label', '无法删除玩家坐标');
                
                // 移动端添加点击提示
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showMobileToast('无法删除玩家坐标');
                });
            } else {
                deleteBtn.title = '删除此标记点';
                deleteBtn.setAttribute('aria-label', '删除此标记点');
                deleteBtn.addEventListener('click', () => {
                    this.removeCoordinate(coord.id);
                });
            }
            
            actionsDiv.appendChild(deleteBtn);
            
            item.appendChild(dragHandle);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);
            
            this.setupDragEvents(item);
            this.coordinatesList.appendChild(item);
        });
    }
    
    setupDragEvents(item) {
        // 只为拖拽手柄添加拖拽事件，而不是整个item
        const dragHandle = item.querySelector('.drag-handle');
        
        // 桌面端拖拽事件（只在拖拽手柄上）
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.draggedItem = item;
            this.isDragging = false;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            
            item.classList.add('dragging');
            
            // 创建占位符
            this.placeholder = this.createPlaceholder();
            
            const handleMouseMove = (e) => {
                const deltaX = Math.abs(e.clientX - this.dragStartX);
                const deltaY = Math.abs(e.clientY - this.dragStartY);
                
                if (!this.isDragging && (deltaX > 5 || deltaY > 5)) {
                    this.isDragging = true;
                }
                
                if (this.isDragging) {
                    // 在拖拽过程中处理悬停效果
                    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                    const targetItem = elementBelow?.closest('.coordinate-item');
                    
                    if (targetItem && targetItem !== this.draggedItem) {
                        this.handleDragOver(e, targetItem);
                    }
                }
            };
            
            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                if (this.isDragging) {
                    this.handleDrop(item);
                }
                
                this.cleanupDrag();
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // 移动端触摸事件（只在拖拽手柄上）
        let isDragging = false;
        let touchStartX, touchStartY;
        
        dragHandle.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                isDragging = false;
                
                this.draggedItem = item;
                item.classList.add('dragging');
                this.placeholder = this.createPlaceholder();
                
                // 防止滚动
                document.body.style.overflow = 'hidden';
                this.coordinatesList.style.overflow = 'hidden';
                
                // 提供触觉反馈
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
            
            if (isDragging) {
                e.preventDefault();
                this.handleTouchMove(e);
            }
        }, { passive: false });
        
        dragHandle.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartX);
                const deltaY = Math.abs(touch.clientY - touchStartY);
                
                if (!isDragging && (deltaX > 10 || deltaY > 10)) {
                    isDragging = true;
                    e.preventDefault();
                }
                
                if (isDragging) {
                    e.preventDefault();
                    this.handleTouchMove(e);
                }
            }
        }, { passive: false });
        
        dragHandle.addEventListener('touchend', (e) => {
            if (isDragging) {
                this.handleTouchEnd(e);
            }
            this.cleanupDrag();
            
            // 恢复滚动
            document.body.style.overflow = '';
            this.coordinatesList.style.overflow = 'auto';
        }, { passive: true });
        
        // 避免点击事件冲突
        dragHandle.addEventListener('touchcancel', (e) => {
            this.cleanupDrag();
            document.body.style.overflow = '';
            this.coordinatesList.style.overflow = 'auto';
        }, { passive: true });
        
        // 移除item上的通用触摸事件，避免冲突
    }
    
    createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'coordinate-item';
        placeholder.style.opacity = '0.5';
        placeholder.style.border = '2px dashed #007cba';
        placeholder.innerHTML = '<div style="height: 40px;"></div>';
        return placeholder;
    }
    
    handleDragOver(e, item) {
        if (this.draggedItem && this.draggedItem !== item) {
            const rect = item.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (e.clientY < middle) {
                item.parentNode.insertBefore(this.placeholder, item);
            } else {
                item.parentNode.insertBefore(this.placeholder, item.nextSibling);
            }
        }
    }
    
    handleDrop(item) {
        if (this.draggedItem && this.draggedItem !== item) {
            this.performMove(item);
        }
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elements.find(el => el.classList.contains('coordinate-item') && el !== this.draggedItem);
        
        if (targetItem) {
            const rect = targetItem.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (touch.clientY < middle) {
                targetItem.parentNode.insertBefore(this.placeholder, targetItem);
            } else {
                targetItem.parentNode.insertBefore(this.placeholder, targetItem.nextSibling);
            }
        }
    }
    
    handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elements.find(el => el.classList.contains('coordinate-item') && el !== this.draggedItem);
        
        if (targetItem) {
            this.performMove(targetItem);
        }
    }
    
    performMove(targetItem) {
        const fromIndex = parseInt(this.draggedItem.dataset.index);
        const toIndex = parseInt(targetItem.dataset.index);
        
        // 计算实际的目标位置
        let actualToIndex = toIndex;
        if (this.placeholder.nextSibling === targetItem) {
            actualToIndex = toIndex;
        } else if (this.placeholder.previousSibling === targetItem) {
            actualToIndex = toIndex + 1;
        }
        
        this.moveCoordinate(fromIndex, actualToIndex);
    }
    
    cleanupDrag() {
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
        }
        
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
        this.placeholder = null;
        this.isDragging = false;
    }
    
    updateCount() {
        this.coordinatesCount.textContent = this.coordinates.length;
    }
    
    exportCoordinates() {
        let coordsText = '';
        let exportCoords = [...this.coordinates];
        
        // 如果少于512个，用默认Bot坐标填充
        while (exportCoords.length < this.maxCoordinates) {
            exportCoords.push({
                x: 0,
                y: 0,
                name: `Bot${this.nextBotId + exportCoords.length - this.coordinates.length}`
            });
        }
        
        // 只取前512个
        exportCoords = exportCoords.slice(0, this.maxCoordinates);
        
        for (const coord of exportCoords) {
            coordsText += `${coord.x},${coord.y},\n`;
        }
        
        this.copyToClipboard(coordsText, '坐标');
    }
    
    exportNames() {
        let namesText = '';
        let exportCoords = [...this.coordinates];
        
        // 如果少于512个，用默认Bot名称填充
        while (exportCoords.length < this.maxCoordinates) {
            exportCoords.push({
                name: `Bot${this.nextBotId + exportCoords.length - this.coordinates.length}`
            });
        }
        
        // 只取前512个
        exportCoords = exportCoords.slice(0, this.maxCoordinates);
        
        for (const coord of exportCoords) {
            namesText += `"${coord.name}",\n`;
        }
        
        this.copyToClipboard(namesText, '名称');
    }
    
    async copyToClipboard(text, type) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.app.updateStatus(`${type}数据已复制到剪切板`);
            } else {
                // 备用方案
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
                    this.app.updateStatus(`${type}数据已复制到剪切板`);
                } catch (err) {
                    this.app.updateStatus(`${type}数据复制失败，请手动复制`);
                }
                
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('复制失败:', err);
            this.app.updateStatus(`${type}数据复制失败，请手动复制`);
        }
    }
    
    // 获取坐标数据用于其他功能
    getCoordinates() {
        return this.coordinates;
    }
    
    // 清空所有坐标（除了Player）
    clearCoordinates() {
        this.coordinates = this.coordinates.filter(coord => coord.isPlayer);
        this.renderCoordinatesList();
        this.updateCount();
    }
    
    // 移动端Toast提示
    showMobileToast(message) {
        // 检查是否在移动端
        if (!this.app.isMobile()) return;
        
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
            pointer-events: none;
        `;
        
        // 添加CSS动画
        if (!document.querySelector('#toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // 2秒后移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2000);
    }

    // 在地图上显示坐标位置特效
    showCoordinateOnMap(x, y, isPlayer = false) {
        if (!this.app.image) {
            if (this.app.isMobile()) {
                this.showMobileToast('请先加载图片');
            } else {
                this.app.updateStatus('请先加载图片');
            }
            return;
        }
        
        // 转换坐标到画布坐标
        const canvasX = (x - 1) * this.app.zoom + this.app.offsetX;
        const canvasY = (y - 1) * this.app.zoom + this.app.offsetY;
        
        // 检查坐标是否在可见区域内，如果不在则调整视图
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        const margin = 50; // 边距
        
        let needsAdjustment = false;
        let newOffsetX = this.app.offsetX;
        let newOffsetY = this.app.offsetY;
        
        if (canvasX < margin) {
            newOffsetX = margin - (x - 1) * this.app.zoom;
            needsAdjustment = true;
        } else if (canvasX > containerRect.width - margin) {
            newOffsetX = (containerRect.width - margin) - (x - 1) * this.app.zoom;
            needsAdjustment = true;
        }
        
        if (canvasY < margin) {
            newOffsetY = margin - (y - 1) * this.app.zoom;
            needsAdjustment = true;
        } else if (canvasY > containerRect.height - margin) {
            newOffsetY = (containerRect.height - margin) - (y - 1) * this.app.zoom;
            needsAdjustment = true;
        }
        
        // 如果需要调整视图，平滑移动到目标位置
        if (needsAdjustment) {
            this.animateToPosition(newOffsetX, newOffsetY, () => {
                this.showLocationEffect(x, y, isPlayer);
            });
        } else {
            this.showLocationEffect(x, y, isPlayer);
        }
        
        // 提供用户反馈
        if (this.app.isMobile()) {
            this.showMobileToast(`已定位到 ${isPlayer ? 'Player' : 'Bot'} 坐标: (${x}, ${y})`);
        }
    }
    
    // 平滑移动到指定位置
    animateToPosition(targetX, targetY, callback) {
        const startX = this.app.offsetX;
        const startY = this.app.offsetY;
        const duration = 500; // 动画持续时间
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.app.offsetX = Math.round(startX + (targetX - startX) * easeProgress);
            this.app.offsetY = Math.round(startY + (targetY - startY) * easeProgress);
            
            this.app.imageRenderer.requestRender();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        
        animate();
    }
    
    // 显示位置特效
    showLocationEffect(x, y, isPlayer = false) {
        // 转换坐标到画布坐标
        const canvasX = (x - 1) * this.app.zoom + this.app.offsetX;
        const canvasY = (y - 1) * this.app.zoom + this.app.offsetY;
        
        // 绘制临时高亮标记
        this.drawHighlightMarker(canvasX, canvasY, isPlayer);
        
        // 显示状态信息
        const coordType = isPlayer ? 'Player' : 'Bot';
        this.app.updateStatus(`已定位到 ${coordType} 坐标: (${x}, ${y})`);
    }
    
    // 绘制高亮标记
    drawHighlightMarker(canvasX, canvasY, isPlayer = false) {
        const ctx = this.app.ctx;
        
        // 根据是否是Player使用不同颜色
        const color = isPlayer ? '#007cba' : '#28a745';
        
        // 清除之前可能存在的动画
        if (this.currentAnimation) {
            cancelAnimationFrame(this.currentAnimation);
        }
        
        // 绘制脉动效果
        const pulseAnimation = (frame) => {
            if (frame > 60) { // 1秒动画（60fps）
                this.currentAnimation = null;
                return;
            }
            
            // 重新渲染图像以清除之前的标记
            this.app.imageRenderer.renderImage();
            
            ctx.save();
            ctx.globalAlpha = Math.max(0.1, 1 - (frame / 60) * 0.7); // 透明度渐变
            
            // 绘制扩散圆圈
            const radius = (frame / 60) * 25 + 8;
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, 3 - (frame / 60) * 2);
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            
            // 绘制中心点
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.max(0.3, 1 - (frame / 60) * 0.5);
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
            
            this.currentAnimation = requestAnimationFrame(() => pulseAnimation(frame + 1));
        };
        
        pulseAnimation(0);
    }
} 