// 缩放控制模块
export class ZoomController {
    constructor(app) {
        this.app = app;
    }

    zoomIn() {
        if (this.app.zoom < 10) {
            const oldZoom = this.app.zoom;
            this.app.zoom = Math.min(this.app.zoom * 1.5, 10);
            
            // 以画布中心为缩放中心
            const containerRect = this.app.canvasContainer.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            
            const zoomRatio = this.app.zoom / oldZoom;
            this.app.offsetX = centerX - (centerX - this.app.offsetX) * zoomRatio;
            this.app.offsetY = centerY - (centerY - this.app.offsetY) * zoomRatio;
            
            this.app.imageRenderer.renderImage();
            this.app.updateZoomLevel();
        }
    }

    zoomOut() {
        if (this.app.zoom > 0.1) {
            const oldZoom = this.app.zoom;
            this.app.zoom = Math.max(this.app.zoom / 1.5, 0.1);
            
            // 以画布中心为缩放中心
            const containerRect = this.app.canvasContainer.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            
            const zoomRatio = this.app.zoom / oldZoom;
            this.app.offsetX = centerX - (centerX - this.app.offsetX) * zoomRatio;
            this.app.offsetY = centerY - (centerY - this.app.offsetY) * zoomRatio;
            
            this.app.imageRenderer.renderImage();
            this.app.updateZoomLevel();
        }
    }

    resetZoom() {
        this.app.zoom = 1;
        this.app.offsetX = 0;
        this.app.offsetY = 0;
        this.app.imageRenderer.renderImage();
        this.app.updateZoomLevel();
    }

    updateCursorStyle() {
        if (!this.app.image) return;
        
        const scaledWidth = this.app.originalWidth * this.app.zoom;
        const scaledHeight = this.app.originalHeight * this.app.zoom;
        const containerRect = this.app.canvasContainer.getBoundingClientRect();
        
        if (scaledWidth > containerRect.width || scaledHeight > containerRect.height) {
            this.app.canvas.style.cursor = 'grab';
        } else {
            this.app.canvas.style.cursor = 'crosshair';
        }
    }
} 