// pages/publish-post/index.js
const app = getApp();

Page({
  data: {
    content: '',
    images: [],
    category: '',
    categories: ['互助问答', '新鲜事', '避坑指南', '宠物联盟'],
    canPublish: false
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.checkValidity();
  },

  onChooseImage() {
    const maxCount = 9;
    const currentCount = this.data.images.length;
    if (currentCount >= maxCount) return;

    wx.chooseMedia({
      count: maxCount - currentCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          images: [...this.data.images, ...tempFiles]
        });
      }
    });
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current,
      urls: this.data.images
    });
  },

  showCategoryActionSheet() {
    wx.showActionSheet({
      itemList: this.data.categories,
      success: (res) => {
        this.setData({ category: this.data.categories[res.tapIndex] });
        this.checkValidity();
      }
    });
  },

  checkValidity() {
    const isValid = this.data.content.trim().length > 0 && this.data.category;
    this.setData({ canPublish: isValid });
  },

  async uploadImages() {
    const uploads = this.data.images.map(async (filePath) => {
      let ext = '.jpg';
      const match = filePath.match(/\.[^.]+?$/);
      if (match) ext = match[0];
      
      const cloudPath = `posts/${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
      try {
        const res = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });
        return res.fileID;
      } catch (e) {
        console.error('Upload failed', e);
        throw e;
      }
    });
    return Promise.all(uploads);
  },

  async onPublish() {
    if (!this.data.canPublish) return;

    wx.showLoading({ title: '发布中' });
    try {
      // 1. Upload images
      const fileIDs = await this.uploadImages();

      // 2. Call cloud function
      const res = await wx.cloud.callFunction({
        name: 'publish_post',
        data: {
          content: this.data.content,
          images: fileIDs,
          category: this.data.category
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({ title: '发布成功' });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/community/index'
          });
        }, 1500);
      } else {
        wx.showToast({ title: res.result.msg || '发布失败', icon: 'none' });
      }

    } catch (err) {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  }
})