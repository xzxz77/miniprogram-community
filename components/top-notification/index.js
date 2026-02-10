// components/top-notification/index.js
Component({
  properties: {
    // Top offset (e.g. for custom nav bar)
    top: {
      type: Number,
      value: 0
    }
  },

  data: {
    visible: false,
    avatar: '',
    title: '',
    content: '',
    path: '', // Target path to navigate
    
    // Touch handling
    startX: 0,
    translateX: 0,
    transition: 'transform 0.1s linear'
  },

  timer: null,

  lifetimes: {
    attached() {
      // Auto adjust top based on system info if not provided
      if (this.data.top === 0) {
        const sysInfo = wx.getWindowInfo();
        // Add a small buffer or align with status bar
        this.setData({ top: sysInfo.statusBarHeight + 8 });
      }
    }
  },

  methods: {
    show(options) {
      if (this.timer) clearTimeout(this.timer);

      this.setData({
        visible: true,
        avatar: options.avatar || '/assets/icons/message-active.png',
        title: options.title || '新消息',
        content: options.content || '您有一条新消息',
        path: options.path || '/pages/messages/index',
        translateX: 0,
        transition: 'transform 0.3s ease-out'
      });

      // Auto hide
      this.timer = setTimeout(() => {
        this.hide();
      }, options.duration || 3000);
    },

    hide() {
      this.setData({ visible: false });
      if (this.timer) clearTimeout(this.timer);
    },

    onTap() {
      if (this.data.path) {
        wx.switchTab({
            url: this.data.path,
            fail: () => {
                wx.navigateTo({ url: this.data.path });
            }
        });
      }
      this.triggerEvent('click');
      this.hide();
    },

    // Swipe to dismiss logic
    onTouchStart(e) {
      if (this.timer) clearTimeout(this.timer);
      this.setData({
        startX: e.touches[0].clientX,
        transition: 'none' // Immediate follow
      });
    },

    onTouchMove(e) {
      const currentX = e.touches[0].clientX;
      const diff = currentX - this.data.startX;
      this.setData({ translateX: diff });
    },

    onTouchEnd(e) {
      const threshold = 100; // Swipe threshold
      if (Math.abs(this.data.translateX) > threshold) {
        // Swipe out
        const direction = this.data.translateX > 0 ? 1 : -1;
        const screenWidth = wx.getWindowInfo().screenWidth;
        
        this.setData({
          transition: 'transform 0.2s ease-out',
          translateX: direction * screenWidth
        });
        
        setTimeout(() => {
          this.hide();
          this.setData({ translateX: 0 }); // Reset for next time
        }, 200);

      } else {
        // Bounce back
        this.setData({
          transition: 'transform 0.3s ease-out',
          translateX: 0
        });
        // Resume auto hide
        this.timer = setTimeout(() => {
          this.hide();
        }, 2000);
      }
    }
  }
})