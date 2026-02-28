// pages/profile/subpages/judge-center/index.js
const app = getApp();

Page({
  data: {
    cases: [],
    isLoading: true
  },

  onLoad() {
    this.loadCases();
  },

  onPullDownRefresh() {
    this.loadCases().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadCases() {
    this.setData({ isLoading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_public_judge_cases'
      });

      if (result.success) {
        this.setData({
          cases: result.data,
          isLoading: false
        });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  onCaseTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/judge-detail/index?id=${id}`
    });
  }
});