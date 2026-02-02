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
    canPublish: false,
    goodId: null, // If present, update mode
    pageTitle: '发布闲置'
  },

  onLoad(options) {
    // 开启返回确认提示
    if (wx.enableAlertBeforeUnload) {
      wx.enableAlertBeforeUnload({
        message: '您的修改尚未发布，确定要退出吗？',
        success: (res) => {
          console.log('enableAlertBeforeUnload success', res)
        },
        fail: (err) => {
          console.log('enableAlertBeforeUnload fail', err)
        }
      });
    }

    if (options.id) {
      this.setData({ 
        goodId: options.id,
        pageTitle: '编辑商品'
      });
      this.loadGoodData(options.id);
    } else {
      this.checkValidity();
    }
  },

  async loadGoodData(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods').doc(id).get();
      const good = res.data;
      
      // Map data to state
      const categoryIndex = this.data.categories.indexOf(good.category);
      const deliveryIndex = this.data.deliveryMethods.indexOf(good.deliveryMethod);

      this.setData({
        title: good.title,
        description: good.description,
        price: good.price.toString(),
        images: good.images,
        categoryIndex: categoryIndex >= 0 ? categoryIndex : -1,
        deliveryIndex: deliveryIndex >= 0 ? deliveryIndex : 2,
        location: good.location || '幸福花园小区',
        agreed: true // Edit mode assumes agreed
      });
      
      this.checkValidity();
      wx.hideLoading();
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
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

      let ext = '.jpg'; // Default extension
      const match = filePath.match(/\.[^.]+?$/);
      if (match) {
          ext = match[0];
      }
      
      const cloudPath = `goods/${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
      
      try {
        const res = await wx.cloud.uploadFile({
          cloudPath,
          filePath,
        });
        fileIDs.push(res.fileID);
      } catch (e) {
        console.error('Upload failed for path:', filePath, e);
        throw e;
      }
      
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

      // Add ID if update mode
      if (this.data.goodId) {
        goodData._id = this.data.goodId;
      }

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
        
        const publishedId = res.result.id || this.data.goodId;

        // Reset data
        this.setData({
          images: [], 
          title: '',
          description: '',
          price: '',
          categoryIndex: -1, 
          agreed: false,
          canPublish: false,
          goodId: null,
          pageTitle: '发布闲置'
        });

        setTimeout(() => {
          // 跳转到详情页，避免 navigateTo 栈过深使用 redirectTo
          wx.redirectTo({
            url: `/pages/goods-detail/index?id=${publishedId}`
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
