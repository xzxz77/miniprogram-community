const app = getApp();

Page({
  data: {
    caseId: '',
    caseInfo: null,
    isLoading: true,
    
    // Defendant response form
    response: '',
    images: [],
    maxImages: 3,
    isSubmitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ caseId: options.id });
      this.loadCaseDetail();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async loadCaseDetail() {
    this.setData({ isLoading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_judge_case_detail',
        data: { caseId: this.data.caseId }
      });

      if (result.success) {
        this.setData({
          caseInfo: result.data,
          isLoading: false
        });
        
        // Start countdown if voting
        if (result.data.status === 'voting' && result.data.approveTime) {
            this.startCountdown(result.data.approveTime);
        }
      } else {
        wx.showToast({ title: result.msg || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  startCountdown(startTimeStr) {
    if (this.timer) clearInterval(this.timer);
    
    const update = () => {
        const now = new Date().getTime();
        const start = new Date(startTimeStr).getTime();
        const end = start + 24 * 60 * 60 * 1000;
        const diff = end - now;
        
        if (diff <= 0) {
            this.setData({ timeLeft: '投票已截止' });
            clearInterval(this.timer);
            // Optionally reload to check if status changed
        } else {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            this.setData({ timeLeft: `${h}小时${m}分` });
        }
    };
    
    update();
    this.timer = setInterval(update, 60000);
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },

  onResponseInput(e) {
    this.setData({ response: e.detail.value });
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

  previewImage(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      urls,
      current
    });
  },

  async submitResponse() {
    if (!this.data.response.trim()) {
      wx.showToast({ title: '请输入申辩内容', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中' });

    try {
      // Upload images
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
        name: 'update_judge_case_evidence',
        data: {
          caseId: this.data.caseId,
          response: this.data.response,
          evidence: fileIDs
        }
      });

      if (result.success) {
        wx.showToast({ title: '提交成功' });
        this.loadCaseDetail(); // Reload to show submitted content
      } else {
        wx.showToast({ title: result.msg || '提交失败', icon: 'none' });
      }

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ isSubmitting: false });
    }
  },

  async onCancelCase() {
    wx.showModal({
      title: '确认撤销',
      content: '撤销后案件将关闭，确定要撤销吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '撤销中' });
          try {
            const { result } = await wx.cloud.callFunction({
              name: 'cancel_judge_case',
              data: { caseId: this.data.caseId }
            });

            wx.hideLoading();
            if (result.success) {
              wx.showToast({ title: '已撤销' });
              this.loadCaseDetail();
            } else {
              wx.showToast({ title: result.msg || '撤销失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '网络异常', icon: 'none' });
          }
        }
      }
    });
  },

  async onVote(e) {
    const support = e.currentTarget.dataset.support;
    
    // Optimistic UI update check
    if (this.data.caseInfo.hasVoted) return;
    if (this.data.caseInfo.userRole !== 'visitor') {
        wx.showToast({ title: '当事人不能投票', icon: 'none' });
        return;
    }

    wx.showModal({
      title: '确认投票',
      content: support === 'plaintiff' ? '确定支持原告（买家）吗？' : '确定支持被告（卖家）吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '投票中' });
          try {
            const { result } = await wx.cloud.callFunction({
              name: 'vote_judge_case',
              data: {
                caseId: this.data.caseId,
                support
              }
            });

            wx.hideLoading();
            if (result.success) {
              wx.showToast({ title: '投票成功' });
              this.loadCaseDetail();
            } else {
              wx.showToast({ title: result.msg || '投票失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '网络异常', icon: 'none' });
          }
        }
      }
    });
  },

  onCancelCase() {
    wx.showModal({
      title: '撤销申请',
      content: '确定要撤销本次小判官介入申请吗？撤销后案件将关闭。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '撤销中' });
          try {
            const { result } = await wx.cloud.callFunction({
              name: 'cancel_judge_case',
              data: { caseId: this.data.caseId }
            });
            
            wx.hideLoading();
            if (result.success) {
              wx.showToast({ title: '撤销成功' });
              this.loadCaseDetail();
            } else {
              wx.showToast({ title: result.msg || '撤销失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '网络异常', icon: 'none' });
          }
        }
      }
    });
  }
});