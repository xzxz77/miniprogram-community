// pages/admin/index.js
const app = getApp();

Page({
  data: {
    activeTab: 0,
    tabs: ['举报审核', '案件审核', '进行中案件'],
    reports: [],
    auditCases: [],
    cases: [],
    isLoading: true
  },

  onLoad() {
    this.loadData();
  },

  onTabClick(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
  },

  async loadData() {
    this.setData({ isLoading: true });
    try {
      console.log('Fetching admin data...');
      const { result } = await wx.cloud.callFunction({
        name: 'get_admin_data'
      });
      console.log('Admin data result:', result);

      if (result.success) {
        this.setData({
          reports: result.reports,
          cases: result.cases,
          auditCases: result.auditCases || [],
          isLoading: false
        });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error('Load admin data error:', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  // Report Actions
  async handleReport(e) {
    const { id, action } = e.currentTarget.dataset;
    wx.showLoading({ title: '处理中' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'admin_action',
        data: {
          type: 'report',
          id,
          action
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '处理成功' });
        this.loadData(); // Reload
      } else {
        wx.showToast({ title: '处理失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  // Case Actions
  async handleCase(e) {
    const { id, action } = e.currentTarget.dataset;
    wx.showLoading({ title: '处理中' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'admin_action',
        data: {
          type: 'judge_case',
          id,
          action
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '处理成功' });
        this.loadData(); // Reload
      } else {
        wx.showToast({ title: '处理失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  previewImage(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      urls,
      current
    });
  }
});