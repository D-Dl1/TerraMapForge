// 坐标管理模块
export class CoordinateManager {
    constructor(app) {
        this.app = app;
        this.coordinates = [];
        this.nextBotId = 1;
        this.maxCoordinates = 512;
        
        this.coordinatesList = document.getElementById('coordinatesList');
        this.coordinatesCount = document.getElementById('coordinatesCount');
        this.exportCoordsBtn = document.getElementById('exportCoords');
        this.exportNamesBtn = document.getElementById('exportNames');
        
        this.setupEventListeners();
        this.initializeDefault();
    }
    
    initializeDefault() {
        // 只在移动端默认添加Player坐标点
        if (this.app.isMobile()) {
            this.addCoordinate(0, 0, 'Player', true);
        }
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
            deleteBtn.addEventListener('click', () => {
                this.removeCoordinate(coord.id);
            });
            
            actionsDiv.appendChild(deleteBtn);
            
            item.appendChild(dragHandle);
            item.appendChild(infoDiv);
            item.appendChild(actionsDiv);
            
            this.setupDragEvents(item);
            this.coordinatesList.appendChild(item);
        });
    }
    
    setupDragEvents(item) {
        let draggedElement = null;
        let placeholder = null;
        
        // 支持移动端拖拽
        let touchStartY = 0;
        let touchMoveY = 0;
        let isDragging = false;
        
        // 桌面端拖拽
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            
            // 创建占位符
            placeholder = this.createPlaceholder();
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.outerHTML);
        });
        
        item.addEventListener('dragend', (e) => {
            this.cleanupDrag();
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e, item);
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(item);
        });
        
        // 移动端触摸事件
        item.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            isDragging = false;
        });
        
        item.addEventListener('touchmove', (e) => {
            e.preventDefault();
            touchMoveY = e.touches[0].clientY;
            
            if (Math.abs(touchMoveY - touchStartY) > 10 && !isDragging) {
                isDragging = true;
                draggedElement = item;
                item.classList.add('dragging');
                placeholder = this.createPlaceholder();
            }
            
            if (isDragging) {
                this.handleTouchMove(e);
            }
        });
        
        item.addEventListener('touchend', (e) => {
            if (isDragging) {
                this.handleTouchEnd(e);
            }
            this.cleanupDrag();
        });
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
        if (draggedElement && draggedElement !== item) {
            const rect = item.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (e.clientY < middle) {
                item.parentNode.insertBefore(placeholder, item);
            } else {
                item.parentNode.insertBefore(placeholder, item.nextSibling);
            }
        }
    }
    
    handleDrop(item) {
        if (draggedElement && draggedElement !== item) {
            this.performMove(item);
        }
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elements.find(el => el.classList.contains('coordinate-item') && el !== draggedElement);
        
        if (targetItem) {
            const rect = targetItem.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (touch.clientY < middle) {
                targetItem.parentNode.insertBefore(placeholder, targetItem);
            } else {
                targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
            }
        }
    }
    
    handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elements.find(el => el.classList.contains('coordinate-item') && el !== draggedElement);
        
        if (targetItem) {
            this.performMove(targetItem);
        }
    }
    
    performMove(targetItem) {
        const fromIndex = parseInt(draggedElement.dataset.index);
        const toIndex = parseInt(targetItem.dataset.index);
        
        // 计算实际的目标位置
        let actualToIndex = toIndex;
        if (placeholder.nextSibling === targetItem) {
            actualToIndex = toIndex;
        } else if (placeholder.previousSibling === targetItem) {
            actualToIndex = toIndex + 1;
        }
        
        this.moveCoordinate(fromIndex, actualToIndex);
    }
    
    cleanupDrag() {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
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
} 