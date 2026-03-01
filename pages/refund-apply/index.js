const app = getApp();

Page({
  data: {
    orderId: '',
    reasons: ['商品质量问题', '未收到货', '商品与描述不符', '拍错/多拍', '其他'],
    reasonIndex: -1,
    description: '',
    images: [],
    maxImages: 3
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId });
    }
  },

  onReasonChange(e) {
    this.setData({ reasonIndex: e.detail.value });
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
    if (this.data.reasonIndex < 0) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' });
      return;
    }
    
    const reason = this.data.reasons[this.data.reasonIndex];
    
    wx.showLoading({ title: '提交中' });

    try {
      // Upload images first
      const fileIDs = [];
      for (const filePath of this.data.images) {
        const cloudPath = `refund-evidence/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });
        fileIDs.push(uploadRes.fileID);
      }

      // Call cloud function
      const { result } = await wx.cloud.callFunction({
        name: 'create_refund_application',
        data: {
          orderId: this.data.orderId,
          reason: reason,
          description: this.data.description,
          evidence: fileIDs
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '申请成功' });
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