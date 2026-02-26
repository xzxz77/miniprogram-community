// pages/report/index.js
const app = getApp();

Page({
  data: {
    goodId: '',
    good: null,
    reasons: ['诈骗/欺诈', '商品与描述不符', '违禁品', '骚扰/辱骂', '其他'],
    reasonIndex: -1,
    description: '',
    images: [],
    maxImages: 3
  },

  onLoad(options) {
    if (options.goodId) {
      this.setData({ goodId: options.goodId });
      this.loadGoodInfo(options.goodId);
    }
  },

  async loadGoodInfo(id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('goods').doc(id).get();
      this.setData({ good: res.data });
    } catch (err) {
      console.error(err);
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

  async onApplyJudge() {
    if (this.data.reasonIndex < 0) {
      wx.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请输入详细描述', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '申请小判官介入',
      content: '申请后将由社区大众评审进行公投裁决，是否确认？',
      success: async (res) => {
        if (res.confirm) {
          this.submitJudgeCase();
        }
      }
    });
  },

  async submitJudgeCase() {
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

      const { result } = await wx.cloud.callFunction({
        name: 'create_judge_case',
        data: {
          goodId: this.data.goodId,
          reason: this.data.reasons[this.data.reasonIndex],
          description: this.data.description,
          evidence: fileIDs
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '申请成功' });
        setTimeout(() => {
          // Redirect to judge detail page so user can see their case
          wx.redirectTo({
            url: `/pages/judge-detail/index?id=${result.id}`
          });
        }, 1500);
      } else {
        wx.showToast({ title: result.msg || '申请失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  async submit() {
    if (this.data.reasonIndex < 0) {
      wx.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }
    
    const reason = this.data.reasons[this.data.reasonIndex];
    
    wx.showLoading({ title: '提交中' });

    try {
      // Upload images first
      const fileIDs = [];
      for (const filePath of this.data.images) {
        const cloudPath = `report-evidence/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        });
        fileIDs.push(uploadRes.fileID);
      }

      // Call cloud function
      const { result } = await wx.cloud.callFunction({
        name: 'report_item',
        data: {
          goodId: this.data.goodId,
          reason: reason,
          description: this.data.description,
          evidence: fileIDs
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '举报成功' });
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