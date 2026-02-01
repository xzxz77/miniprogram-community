// pages/publish/index.js
Page({
  data: {
    images: [], 
    title: '',
    description: '',
    price: '',
    location: '幸福花园小区',
    
    categories: ['家具', '数码', '衣物', '图书', '其他'],
    categoryIndex: -1, 
    
    deliveryMethods: ['自提', '邮寄', '自提/邮寄'],
    deliveryIndex: 2, 
    
    agreed: false,
    canPublish: false
  },

  onLoad(options) {
    // Initial check
    this.checkValidity();
  },

  onShow() {
    // Restore draft if exists
    const draft = wx.getStorageSync('publish_draft');
    if (draft) {
      this.setData({
        ...draft
      });
      // Re-check validity after restoring
      this.checkValidity();
    }
  },

  onHide() {
    // Save draft when leaving page (switching tab or navigating away)
    this.saveDraft();
  },

  onUnload() {
    // Save draft when page is destroyed (though tab page usually isn't)
    this.saveDraft();
  },

  saveDraft() {
    const { title, description, price, images, categoryIndex, deliveryIndex, location, agreed } = this.data;
    // Only save if there's some content
    if (title || description || images.length > 0) {
      wx.setStorageSync('publish_draft', {
        title, description, price, images, categoryIndex, deliveryIndex, location, agreed
      });
    }
  },

  // Check if form is valid
  checkValidity() {
    const { title, description, price, images, categoryIndex, agreed } = this.data;
    const priceVal = parseFloat(price);
    const isValid = title && title.trim().length > 0 && 
                    description && description.trim().length > 0 && 
                    priceVal && priceVal >= 0.01 && priceVal <= 10000 &&
                    images && images.length > 0 && 
                    categoryIndex >= 0 && 
                    agreed;
    
    if (this.data.canPublish !== isValid) {
      this.setData({ canPublish: isValid });
    }
  },

  onCancel() {
    this.saveDraft();
    // Switch to Home tab
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  // Inputs
  onTitleInput(e) {
    this.setData({ title: e.detail.value })
    this.checkValidity()
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
    this.checkValidity()
  },

  onPriceInput(e) {
    let value = e.detail.value;

    // Filter non-digit/dot characters
    value = value.replace(/[^\d.]/g, "");

    // Ensure only one dot
    const dots = value.match(/\./g);
    if (dots && dots.length > 1) {
      value = value.substring(0, value.lastIndexOf('.'));
    }

    // Limit to 2 decimal places
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1 && value.length - dotIndex > 3) {
      value = value.substring(0, dotIndex + 3);
    }

    // Max limit 10000
    if (parseFloat(value) > 9999.99) {
      value = "9999.99";
    }

    this.setData({ price: value })
    this.checkValidity()
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: e.detail.value })
    this.checkValidity()
  },

  // Changed to button selection logic
  onDeliverySelect(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ deliveryIndex: index });
  },

  onAgreeTap() {
    this.setData({ agreed: !this.data.agreed })
    this.checkValidity()
  },

  // Images
  onChooseImage() {
    const maxCount = 5;
    const currentCount = this.data.images.length;
    
    if (currentCount >= maxCount) return;

    wx.chooseMedia({
      count: maxCount - currentCount, // Limit to remaining slots
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...tempFiles]
        })
        this.checkValidity()
      }
    })
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url
    wx.previewImage({
      current,
      urls: this.data.images
    })
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index;
    const newImages = [...this.data.images];
    newImages.splice(index, 1);
    this.setData({ images: newImages });
    this.checkValidity()
  },

  // Upload
  async uploadImages() {
    const uploads = this.data.images.map(async (filePath) => {
      // Check if it's already a cloud ID
      if (filePath.startsWith('cloud://')) return filePath;

      const ext = filePath.match(/\.[^.]+?$/)[0];
      const cloudPath = `goods/${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
      
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath,
      });
      return res.fileID;
    });

    return Promise.all(uploads);
  },

  // Publish
  async onPublish() {
    if (!this.data.canPublish) return;

    const { title, description, price, images, categoryIndex, categories, deliveryIndex, deliveryMethods, location } = this.data;

    wx.showLoading({ title: '发布中...' });

    try {
      // 1. Upload Images
      const fileIDs = await this.uploadImages();

      // 2. Call Cloud Function
      const goodData = {
        title,
        description,
        price: parseFloat(price),
        images: fileIDs,
        category: categories[categoryIndex],
        deliveryMethod: deliveryMethods[deliveryIndex],
        location,
        favorites: 0,
        views: 0
      };

      const res = await wx.cloud.callFunction({
        name: 'add_good_updata',
        data: {
          data: goodData
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({ title: '发布成功' });
        // Clear draft
        wx.removeStorageSync('publish_draft');
        
        // Reset data
        this.setData({
          images: [], 
          title: '',
          description: '',
          price: '',
          categoryIndex: -1, 
          agreed: false,
          canPublish: false
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index'
          });
        }, 1500);
      } else {
        wx.showToast({ title: res.result.msg || '发布失败', icon: 'none' });
      }

    } catch (err) {
      wx.hideLoading();
      console.error('Publish Error:', err);
      wx.showToast({ title: '发布出错', icon: 'none' });
    }
  }
})
