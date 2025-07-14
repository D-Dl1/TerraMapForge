// 事件处理器模块
export class EventHandlers {
    constructor(app) {
        this.app = app;
        this.activePointers = new Map();
        this.isPointerDragging = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragStartOffsetX = 0;
        this.dragStartOffsetY = 0;
        this.isTouching = false;
        this.touchStartTime = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartOffsetX = 0;
        this.panStartOffsetY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchDistance = 0;
        this.touchStartZoom = 1;
        this.zoomCenterX = 0;
        this.zoomCenterY = 0;
        this.zoomStartOffsetX = 0;
        this.zoomStartOffsetY = 0;
        
        // 性能优化
        this.lastMoveTime = 0;
        this.moveThrottleMs = 16; // 约60fps
    }

    setupCanvasInteraction() {
        const canvas = this.app.canvas;
        
        // 检查是否支持指针事件
        const supportsPointer = 'onpointerdown' in window;
        
        if (supportsPointer) {
            // 使用指针事件（现代浏览器推荐）
            canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
            canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
            canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
            canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
            canvas.addEventListener('pointerleave', (e) => this.handlePointerUp(e));
        } else {
            // 回退到传统鼠标事件
            canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        }
        
        // 通用事件
        canvas.addEventListener('click', (e) => this.handleClick(e));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // 触摸板手势事件
        canvas.addEventListener('gesturestart', (e) => this.handleGestureStart(e));
        canvas.addEventListener('gesturechange', (e) => this.handleGestureChange(e));
        canvas.addEventListener('gestureend', (e) => this.handleGestureEnd(e));
        
        // 触摸事件（移动端）
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // 阻止默认的触摸行为
        canvas.addEventListener('touchstart', (e) => e.preventDefault());
        canvas.addEventListener('touchmove', (e) => e.preventDefault());
        canvas.addEventListener('touchend', (e) => e.preventDefault());
        
        // 阻止右键菜单
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 阻止触摸板的默认手势
        canvas.addEventListener('gesturestart', (e) => e.preventDefault());
        canvas.addEventListener('gesturechange', (e) => e.preventDefault());
        canvas.addEventListener('gestureend', (e) => e.preventDefault());
    }

    // 节流移动事件处理
    throttledRender() {
        const now = Date.now();
        if (now - this.lastMoveTime >= this.moveThrottleMs) {
            this.app.imageRenderer.requestRender();
            this.lastMoveTime = now;
        }
    }

    // 指针事件处理
    handlePointerDown(e) {
        if (!this.app.image) return;
        
        if (e.button !== 0) return;
        
        this.activePointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
            type: e.pointerType,
            startX: e.clientX,
            startY: e.clientY
        });
        
        if (this.activePointers.size === 1) {
            this.isPointerDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragStartOffsetX = this.app.offsetX;
            this.dragStartOffsetY = this.app.offsetY;
            
            this.app.canvas.style.cursor = 'grabbing';
            
            try {
                this.app.canvas.setPointerCapture(e.pointerId);
            } catch (err) {
                console.log('setPointerCapture not supported');
            }
        }
        
        e.preventDefault();
    }

    handlePointerMove(e) {
        if (!this.app.image) return;
        
        if (this.activePointers.has(e.pointerId)) {
            const pointer = this.activePointers.get(e.pointerId);
            this.activePointers.set(e.pointerId, {
                ...pointer,
                x: e.clientX,
                y: e.clientY
            });
        }
        
        if (this.isPointerDragging && this.activePointers.size === 1) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            this.app.offsetX = this.dragStartOffsetX + deltaX;
            this.app.offsetY = this.dragStartOffsetY + deltaY;
            
            this.throttledRender();
        } else if (this.activePointers.size === 2) {
            this.handleMultiPointerZoom();
        } else if (!this.isPointerDragging) {
            this.app.updateCursorStyle();
        }
    }

    handleMultiPointerZoom() {
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length !== 2) return;
        
        const [p1, p2] = pointers;
        const currentDistance = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
        );
        
        const startDistance = Math.sqrt(
            Math.pow(p1.startX - p2.startX, 2) + Math.pow(p1.startY - p2.startY, 2)
        );
        
        if (startDistance > 0 && currentDistance > 0) {
            const scale = currentDistance / startDistance;
            const centerX = (p1.x + p2.x) / 2;
            const centerY = (p1.y + p2.y) / 2;
            
            const rect = this.app.canvas.getBoundingClientRect();
            const canvasCenterX = centerX - rect.left;
            const canvasCenterY = centerY - rect.top;
            
            const oldZoom = this.app.zoom;
            const newZoom = this.touchStartZoom * scale;
            this.app.zoom = Math.min(Math.max(newZoom, 0.1), 10);
            
            const zoomRatio = this.app.zoom / oldZoom;
            this.app.offsetX = canvasCenterX - (canvasCenterX - this.app.offsetX) * zoomRatio;
            this.app.offsetY = canvasCenterY - (canvasCenterY - this.app.offsetY) * zoomRatio;
            
            this.throttledRender();
            this.app.updateZoomLevel();
        }
    }

    handlePointerUp(e) {
        if (!this.app.image) return;
        
        this.activePointers.delete(e.pointerId);
        
        if (this.activePointers.size === 0) {
            this.isPointerDragging = false;
            this.app.updateCursorStyle();
            // 最终渲染确保完整性
            this.app.imageRenderer.requestRender();
        } else if (this.activePointers.size === 1) {
            const remainingPointer = this.activePointers.values().next().value;
            this.dragStartX = remainingPointer.x;
            this.dragStartY = remainingPointer.y;
            this.dragStartOffsetX = this.app.offsetX;
            this.dragStartOffsetY = this.app.offsetY;
            this.isPointerDragging = true;
        }
        
        if (this.activePointers.size === 2) {
            this.touchStartZoom = this.app.zoom;
        }
    }

    handleClick(e) {
        if (!this.app.image || this.isDragging || this.isPointerDragging) return;
        this.app.processClick(e.clientX, e.clientY);
    }

    handleMouseDown(e) {
        if (!this.app.image) return;
        
        if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragStartOffsetX = this.app.offsetX;
        this.dragStartOffsetY = this.app.offsetY;
        
        this.app.canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.app.image) return;
        
        if (this.isDragging) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            this.app.offsetX = this.dragStartOffsetX + deltaX;
            this.app.offsetY = this.dragStartOffsetY + deltaY;
            
            this.throttledRender();
        } else {
            this.app.updateCursorStyle();
        }
    }

    handleMouseUp(e) {
        if (!this.app.image) return;
        
        this.isDragging = false;
        this.app.updateCursorStyle();
        // 最终渲染确保完整性
        this.app.imageRenderer.requestRender();
    }

    handleWheel(e) {
        if (!this.app.image) return;
        
        e.preventDefault();
        
        const isTouchpadPinch = e.ctrlKey;
        const isTouchpadScroll = e.deltaMode === 0 && Math.abs(e.deltaY) < 50;
        
        const rect = this.app.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const oldZoom = this.app.zoom;
        let zoomFactor;
        
        if (isTouchpadPinch) {
            zoomFactor = e.deltaY > 0 ? 0.98 : 1.02;
        } else if (isTouchpadScroll) {
            zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
        } else {
            zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        }
        
        this.app.zoom = Math.min(Math.max(this.app.zoom * zoomFactor, 0.1), 10);
        
        const zoomRatio = this.app.zoom / oldZoom;
        this.app.offsetX = mouseX - (mouseX - this.app.offsetX) * zoomRatio;
        this.app.offsetY = mouseY - (mouseY - this.app.offsetY) * zoomRatio;
        
        this.app.imageRenderer.requestRender();
        this.app.updateZoomLevel();
    }

    handleGestureStart(e) {
        if (!this.app.image) return;
        
        e.preventDefault();
        this.touchStartZoom = this.app.zoom;
        
        const rect = this.app.canvas.getBoundingClientRect();
        this.zoomCenterX = e.clientX - rect.left;
        this.zoomCenterY = e.clientY - rect.top;
    }

    handleGestureChange(e) {
        if (!this.app.image) return;
        
        e.preventDefault();
        
        const oldZoom = this.app.zoom;
        const newZoom = this.touchStartZoom * e.scale;
        this.app.zoom = Math.min(Math.max(newZoom, 0.1), 10);
        
        const zoomRatio = this.app.zoom / oldZoom;
        this.app.offsetX = this.zoomCenterX - (this.zoomCenterX - this.app.offsetX) * zoomRatio;
        this.app.offsetY = this.zoomCenterY - (this.zoomCenterY - this.app.offsetY) * zoomRatio;
        
        this.throttledRender();
        this.app.updateZoomLevel();
    }

    handleGestureEnd(e) {
        if (!this.app.image) return;
        e.preventDefault();
        // 最终渲染确保完整性
        this.app.imageRenderer.requestRender();
    }

    handleTouchStart(e) {
        if (!this.app.image) return;
        
        this.isTouching = true;
        this.touchStartTime = Date.now();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.panStartX = touch.clientX;
            this.panStartY = touch.clientY;
            this.panStartOffsetX = this.app.offsetX;
            this.panStartOffsetY = this.app.offsetY;
            this.isPanning = false;
        } else if (e.touches.length === 2) {
            // 记录初始双指距离和缩放参数
            this.lastTouchDistance = this.getTouchDistance(e.touches);
            this.touchStartZoom = this.app.zoom;
            
            // 计算缩放中心点（相对于canvas）
            const rect = this.app.canvas.getBoundingClientRect();
            this.zoomCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            this.zoomCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
            
            // 记录缩放开始时的偏移量
            this.zoomStartOffsetX = this.app.offsetX;
            this.zoomStartOffsetY = this.app.offsetY;
            
            this.isPanning = false;
        }
    }

    handleTouchMove(e) {
        if (!this.app.image || !this.isTouching) return;
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.panStartX;
            const deltaY = touch.clientY - this.panStartY;
            
            const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (moveDistance > 5) {
                this.isPanning = true;
            }
            
            if (this.isPanning) {
                this.app.offsetX = this.panStartOffsetX + deltaX;
                this.app.offsetY = this.panStartOffsetY + deltaY;
                
                this.throttledRender();
            }
        } else if (e.touches.length === 2) {
            const currentDistance = this.getTouchDistance(e.touches);
            
            if (this.lastTouchDistance > 0 && currentDistance > 0) {
                // 计算缩放比例（相对于初始距离）
                const scale = currentDistance / this.lastTouchDistance;
                
                // 计算新的缩放值（基于touchStartZoom）
                const newZoom = Math.min(Math.max(this.touchStartZoom * scale, 0.1), 10);
                
                // 计算缩放比例（相对于开始缩放时的状态）
                const zoomRatio = newZoom / this.touchStartZoom;
                
                // 使用缩放中心点来计算新的偏移量
                this.app.offsetX = this.zoomCenterX - (this.zoomCenterX - this.zoomStartOffsetX) * zoomRatio;
                this.app.offsetY = this.zoomCenterY - (this.zoomCenterY - this.zoomStartOffsetY) * zoomRatio;
                
                this.app.zoom = newZoom;
                
                this.throttledRender();
                this.app.updateZoomLevel();
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.app.image) return;
        
        const touchDuration = Date.now() - this.touchStartTime;
        
        if (e.touches.length === 0) {
            if (!this.isPanning && touchDuration < 300) {
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (moveDistance < 5) {
                    this.app.processClick(touch.clientX, touch.clientY);
                }
            }
            
            this.isTouching = false;
            this.isPanning = false;
            this.lastTouchDistance = 0;
            
            // 最终渲染确保完整性
            this.app.imageRenderer.requestRender();
        }
    }

    getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
} 