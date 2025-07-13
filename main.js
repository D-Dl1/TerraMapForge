// 主应用文件
import { EventHandlers } from './utils/eventHandlers.js';
import { ImageRenderer } from './utils/imageRenderer.js';
import { ClickHandler } from './utils/clickHandler.js';
import { ZoomController } from './utils/zoomController.js';

class PixelClickerApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.zoom = 1;
        this.imageData = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        // 图片偏移量
        this.offsetX = 0;
        this.offsetY = 0;
        
        // 初始化模块
        this.eventHandlers = new EventHandlers(this);
        this.imageRenderer = new ImageRenderer(this);
        this.clickHandler = new ClickHandler(this);
        this.zoomController = new ZoomController(this);
        
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
                this.imageRenderer.loadImageFromFile(file);
            }
        });
        
        // 改进的拖拽上传支持
        this.setupDragAndDrop();
        
        // 缩放按钮
        this.zoomInBtn.addEventListener('click', () => this.zoomController.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomController.zoomOut());
        this.resetZoomBtn.addEventListener('click', () => this.zoomController.resetZoom());
        
        // 键盘快捷键（仅在桌面端）
        if (!this.isMobile()) {
            document.addEventListener('keydown', (e) => {
                if (!this.image) return;
                
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.zoomController.zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoomController.zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.zoomController.resetZoom();
                }
            });
        }
        
        // 画布交互事件
        this.eventHandlers.setupCanvasInteraction();
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
                    this.imageRenderer.loadImageFromFile(file);
                } else {
                    this.updateStatus('请上传图片文件');
                }
            }
        });
    }
    
    // 代理方法，让模块可以调用主应用的方法
    renderImage() {
        this.imageRenderer.renderImage();
    }
    
    processClick(clientX, clientY) {
        this.clickHandler.processClick(clientX, clientY);
    }
    
    updateCursorStyle() {
        this.zoomController.updateCursorStyle();
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
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
        
        // 移动端状态提示更明显
        if (this.isMobile()) {
            this.statusDiv.style.animation = 'none';
            setTimeout(() => {
                this.statusDiv.style.animation = 'touchFeedback 0.3s ease';
            }, 10);
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PixelClickerApp();
}); 