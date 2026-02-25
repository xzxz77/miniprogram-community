// pages/judge-apply/index.js
const app = getApp();

Page({
  data: {
    goodId: '',
    reason: '',
    description: '',
    images: [],
    maxImages: 3
  },

  onLoad(options) {
    if (options.goodId) {
      this.setData({ goodId: options.goodId });
    }
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  chooseImage() {
    if (this.data.images.length >= this.data.maxImages) return;

    wx.chooseMedia({
      count: this.data.maxImages - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: [...this.data.images, ...tempFiles]
        });
      }
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const newImages = [...this.data.images];
    newImages.splice(index, 1);
    this.setData({ images: newImages });
  },

  async submit() {
    if (!this.data.reason.trim()) {
      wx.showToast({ title: '请输入申诉理由', icon: 'none' });
      return;
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请输入详细描述', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });

    try {
      // Upload images first
      const fileIDs = [];
      for (const filePath of this.data.images) {
        const cloudPath = `judge-evidence/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });
        fileIDs.push(uploadRes.fileID);
      }

      // Call cloud function
      const { result } = await wx.cloud.callFunction({
        name: 'create_judge_case',
        data: {
          goodId: this.data.goodId,
          reason: this.data.reason,
          description: this.data.description,
          evidence: fileIDs
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '提交成功' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: result.msg || '提交失败', icon: 'none' });
      }

    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  }
});